import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { WorkOrder, VehicleDayTrack } from '@track-patch/lib';
import solver from 'javascript-lp-solver';
import pLimit from 'p-limit';
import { parseWorkDate, vehicleidFromResourceName } from './workorder_utils';
import { isMilpBackendAvailable, solveVehicleWithBackend } from './milpBackendClient';

dayjs.extend(customParseFormat);

const DATE_FORMAT = 'YYYY-MM-DD';
const MAX_INTERVAL_GAP_SECONDS = 30 * 60;
const MIN_INTERVAL_SECONDS = 60;

type VehicleDayTrackProvider = (vehicleId: number, day: string) => VehicleDayTrack | undefined | null;

type ParsedOrder = {
    id: string;
    workOrder: WorkOrder;
    capacity: number;
    day: Dayjs;
};

type Interval = {
    id: string;
    vehicleId: number;
    day: string;
    start: Dayjs;
    end: Dayjs;
    durationSeconds: number;
    durationHours: number;
};

type SegmentUsage = {
    interval: Interval;
    seconds: number;
};

export type MilpTimeline = {
    assignedHours: number;
    start?: Dayjs;
    end?: Dayjs;
};

export type MilpSummary = {
    totalReportedHours: number;
    totalGpsHours: number;
    assignedHours: number;
};

type VehicleMilpResult = {
    timelines: Map<WorkOrder, MilpTimeline>;
    gpsHours: number;
    assignedHours: number;
    reportedMatchedHours: number;
};

export async function assignMilpTimelines({
    workorders,
    getTrack,
}: {
    workorders: WorkOrder[],
    getTrack: VehicleDayTrackProvider,
}): Promise<{ assignments: Map<WorkOrder, MilpTimeline>, summary: MilpSummary }> {
    const assignments = new Map<WorkOrder, MilpTimeline>();
    const byVehicle = new Map<number, ParsedOrder[]>();
    let totalReported = 0;

    workorders.forEach((wo, index) => {
        const vehicleId = vehicleidFromResourceName(wo['Resource Name'] || '');
        if (!vehicleId) return;
        const targetDay = parseWorkDate(wo['Work Date']);
        const resourceType = (wo['Resource Type'] || '').toLowerCase();
        if (!resourceType.includes('equipment')) return;
        const capacity = hoursFromWorkOrder(wo);
        if (!targetDay || capacity <= 0) return;
        totalReported += capacity;
        const parsed: ParsedOrder = {
            id: `${vehicleId}-${index}`,
            workOrder: wo,
            capacity,
            day: targetDay.startOf('day'),
        };
        const orders = byVehicle.get(vehicleId) || [];
        orders.push(parsed);
        byVehicle.set(vehicleId, orders);
    });

    let totalGpsHours = 0;
    let totalAssigned = 0;
    let totalReportedMatched = 0;
    const backendEnabled = isMilpBackendAvailable();
    const hardwareCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const concurrency = backendEnabled ? Math.max(1, Math.min(byVehicle.size, hardwareCores)) : 1;
    const limiter = pLimit(concurrency);
    const vehicleEntries = Array.from(byVehicle.entries());
    const results = await Promise.all(
        vehicleEntries.map(([vehicleId, orders]) =>
            limiter(async () => backendEnabled
                ? solveVehicleViaBackend(vehicleId, orders, getTrack)
                : solveVehicleMilp(vehicleId, orders, getTrack)
            )
        )
    );
    results.forEach((result) => {
        totalGpsHours += result.gpsHours;
        totalAssigned += result.assignedHours;
        totalReportedMatched += result.reportedMatchedHours;
        result.timelines.forEach((timeline, wo) => assignments.set(wo, timeline));
    });

    return {
        assignments,
        summary: {
            totalReportedHours: totalReportedMatched || totalReported,
            totalGpsHours,
            assignedHours: totalAssigned,
        },
    };
}

function solveVehicleMilp(vehicleId: number, orders: ParsedOrder[], getTrack: VehicleDayTrackProvider): VehicleMilpResult {
    const timelines = new Map<WorkOrder, MilpTimeline>();
    if (!orders.length) {
        return { timelines, gpsHours: 0, assignedHours: 0, reportedMatchedHours: 0 };
    }
    const requiredDays = new Set<string>();
    orders.forEach((order) => {
        requiredDays.add(order.day.format(DATE_FORMAT));
        requiredDays.add(order.day.subtract(1, 'day').format(DATE_FORMAT));
        requiredDays.add(order.day.add(1, 'day').format(DATE_FORMAT));
    });
    const intervals = buildIntervals({
        vehicleId,
        days: Array.from(requiredDays),
        getTrack,
    });
    if (!intervals.length) {
        return { timelines, gpsHours: 0, assignedHours: 0, reportedMatchedHours: 0 };
    }
    const model = buildModel(orders, intervals);
    if (!model) {
        return { timelines, gpsHours: sumIntervalHours(intervals), assignedHours: 0, reportedMatchedHours: 0 };
    }
    const solution = solver.Solve(model.model);
    if (!solution || !solution.feasible) {
        return { timelines, gpsHours: sumIntervalHours(intervals), assignedHours: 0, reportedMatchedHours: 0 };
    }
    const segmentsPerOrder = new Map<string, SegmentUsage[]>();
    Object.entries(solution).forEach(([name, value]) => {
        if (!name.startsWith('x__')) return;
        const amount = typeof value === 'number' ? value : Number(value);
        if (!amount || amount <= 0) return;
        const parts = name.split('__');
        if (parts.length !== 3) return;
        const orderId = parts[1]!;
        const intervalId = parts[2]!;
        const interval = model.intervalById.get(intervalId);
        const order = model.orderById.get(orderId);
        if (!interval || !order) return;
        const seconds = Math.max(0, Math.min(interval.durationSeconds, interval.durationSeconds * amount));
        if (seconds <= 0) return;
        const list = segmentsPerOrder.get(orderId) || [];
        list.push({ interval, seconds });
        segmentsPerOrder.set(orderId, list);
    });

    const { timelines: computedTimelines, assignedSeconds } = buildTimelinesFromSegments(segmentsPerOrder, model.orderById);
    computedTimelines.forEach((timeline, wo) => timelines.set(wo, timeline));

    return {
        timelines,
        gpsHours: sumIntervalHours(intervals),
        assignedHours: assignedSeconds / 3600,
        reportedMatchedHours: sumMatchedReportedHours(orders, timelines),
    };
}

async function solveVehicleViaBackend(vehicleId: number, orders: ParsedOrder[], getTrack: VehicleDayTrackProvider): Promise<VehicleMilpResult> {
    const timelines = new Map<WorkOrder, MilpTimeline>();
    if (!orders.length) {
        return { timelines, gpsHours: 0, assignedHours: 0, reportedMatchedHours: 0 };
    }
    const requiredDays = new Set<string>();
    orders.forEach((order) => {
        requiredDays.add(order.day.format(DATE_FORMAT));
        requiredDays.add(order.day.subtract(1, 'day').format(DATE_FORMAT));
        requiredDays.add(order.day.add(1, 'day').format(DATE_FORMAT));
    });
    const intervals = buildIntervals({
        vehicleId,
        days: Array.from(requiredDays),
        getTrack,
    });
    if (!intervals.length) {
        return { timelines, gpsHours: 0, assignedHours: 0, reportedMatchedHours: 0 };
    }
    const orderMap = new Map<string, ParsedOrder>();
    orders.forEach((order) => orderMap.set(order.id, order));
    const intervalMap = new Map<string, Interval>();
    intervals.forEach((interval) => intervalMap.set(interval.id, interval));

    try {
        const response = await solveVehicleWithBackend({
            vehicleId,
            orders: orders.map((order) => ({
                id: order.id,
                day: order.day.format(DATE_FORMAT),
                capacitySeconds: Math.max(0, Math.round(order.capacity * 3600)),
            })),
            intervals: intervals.map((interval) => ({
                id: interval.id,
                day: interval.day,
                start: interval.start.unix(),
                durationSeconds: interval.durationSeconds,
            })),
        });

        const segmentsPerOrder = new Map<string, SegmentUsage[]>();
        response.assignments.forEach((assignment) => {
            const interval = intervalMap.get(assignment.intervalId);
            if (!interval) return;
            const seconds = Math.min(interval.durationSeconds, Math.max(0, assignment.seconds));
            if (seconds <= 0) return;
            const list = segmentsPerOrder.get(assignment.orderId) || [];
            list.push({ interval, seconds });
            segmentsPerOrder.set(assignment.orderId, list);
        });
        const { timelines: computedTimelines, assignedSeconds } = buildTimelinesFromSegments(segmentsPerOrder, orderMap);
        computedTimelines.forEach((timeline, wo) => timelines.set(wo, timeline));
        return {
            timelines,
            gpsHours: sumIntervalHours(intervals),
            assignedHours: assignedSeconds / 3600,
            reportedMatchedHours: sumMatchedReportedHours(orders, timelines),
        };
    } catch (error) {
        console.warn(`MILP backend failed for vehicle ${vehicleId}, falling back to browser solver`, error);
        return solveVehicleMilp(vehicleId, orders, getTrack);
    }
}

function deriveTimeline(segments: SegmentUsage[]): MilpTimeline | null {
    if (!segments.length) return null;
    const sorted = [...segments].sort((a, b) => a.interval.start.valueOf() - b.interval.start.valueOf());
    const totalSeconds = sorted.reduce((sum, seg) => sum + seg.seconds, 0);
    if (totalSeconds <= 0) return null;
    const start = sorted[0]!.interval.start;
    let end = start;
    sorted.forEach((segment) => {
        const seconds = Math.min(segment.seconds, segment.interval.durationSeconds);
        if (seconds <= 0) return;
        end = segment.interval.start.add(seconds, 'second');
    });
    return {
        assignedHours: totalSeconds / 3600,
        start,
        end,
    };
}

function buildTimelinesFromSegments(
    segmentsPerOrder: Map<string, SegmentUsage[]>,
    orderLookup: Map<string, ParsedOrder>,
): { timelines: Map<WorkOrder, MilpTimeline>, assignedSeconds: number } {
    const timelines = new Map<WorkOrder, MilpTimeline>();
    let assignedSeconds = 0;
    segmentsPerOrder.forEach((segments, orderId) => {
        const order = orderLookup.get(orderId);
        if (!order) return;
        assignedSeconds += segments.reduce((sum, seg) => sum + seg.seconds, 0);
        const timeline = deriveTimeline(segments);
        if (timeline) {
            timelines.set(order.workOrder, timeline);
        }
    });
    return { timelines, assignedSeconds };
}

function sumIntervalHours(intervals: Interval[]): number {
    return intervals.reduce((sum, interval) => sum + interval.durationHours, 0);
}

function buildIntervals({
    vehicleId,
    days,
    getTrack,
}: {
    vehicleId: number,
    days: string[],
    getTrack: VehicleDayTrackProvider,
}): Interval[] {
    const intervals: Interval[] = [];
    const seenDays = new Set<string>();
    days.forEach((day) => {
        if (seenDays.has(day)) return;
        seenDays.add(day);
        const track = getTrack(vehicleId, day);
        if (!track || !Array.isArray(track.track) || !track.track.length) return;
        const segments = trackPointsToIntervals(vehicleId, day, track);
        intervals.push(...segments);
    });
    intervals.sort((a, b) => a.start.valueOf() - b.start.valueOf());
    return intervals;
}

function trackPointsToIntervals(vehicleId: number, day: string, track: VehicleDayTrack): Interval[] {
    const ret: Interval[] = [];
    const points = track.track;
    if (!points.length) return ret;
    let startPoint = points[0]!;
    let prevPoint = points[0]!;
    let counter = 0;
    for (let i = 1; i < points.length; i++) {
        const current = points[i]!;
        const gap = current.time.unix() - prevPoint.time.unix();
        if (gap <= 0) {
            prevPoint = current;
            continue;
        }
        if (gap > MAX_INTERVAL_GAP_SECONDS) {
            pushInterval(ret, vehicleId, day, startPoint, prevPoint, counter++);
            startPoint = current;
        }
        prevPoint = current;
    }
    pushInterval(ret, vehicleId, day, startPoint, prevPoint, counter++);
    return ret;
}

function pushInterval(
    ret: Interval[],
    vehicleId: number,
    day: string,
    start: VehicleDayTrack['track'][number],
    end: VehicleDayTrack['track'][number],
    index: number,
) {
    const durationSeconds = end.time.unix() - start.time.unix();
    if (durationSeconds < MIN_INTERVAL_SECONDS) return;
    ret.push({
        id: `${vehicleId}-${day}-${index}`,
        vehicleId,
        day,
        start: start.time,
        end: end.time,
        durationSeconds,
        durationHours: durationSeconds / 3600,
    });
}

function buildModel(orders: ParsedOrder[], intervals: Interval[]) {
    const constraints: Record<string, { max?: number }> = {};
    const variables: Record<string, Record<string, number>> = {};
    const intervalById = new Map<string, Interval>();
    const orderById = new Map<string, ParsedOrder>();

    orders.forEach((order) => {
        orderById.set(order.id, order);
        constraints[`wo_${order.id}`] = { max: order.capacity };
    });

    intervals.forEach((interval) => {
        intervalById.set(interval.id, interval);
        constraints[`iv_${interval.id}`] = { max: 1 };
    });

    let createdVariables = 0;
    intervals.forEach((interval) => {
        orders.forEach((order) => {
            const dayDelta = interval.start.startOf('day').diff(order.day.startOf('day'), 'day');
            if (Math.abs(dayDelta) > 1) return;
            const varName = `x__${order.id}__${interval.id}`;
            variables[varName] = {
                coverage: interval.durationHours,
                [`wo_${order.id}`]: interval.durationHours,
                [`iv_${interval.id}`]: 1,
            };
            createdVariables++;
        });
    });

    if (!createdVariables) {
        return null;
    }

    const model = {
        optimize: 'coverage',
        opType: 'max',
        constraints,
        variables,
    };

    return { model, intervalById, orderById };
}

function hoursFromWorkOrder(workorder: WorkOrder): number {
    const candidate = workorder['Total Hrs'] ?? workorder['Total Hours'] ?? workorder.computedHours;
    if (!candidate) return 0;
    const cleaned = `${candidate}`.replace(/,/g, '').trim();
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : 0;
}

function sumMatchedReportedHours(orders: ParsedOrder[], timelines: Map<WorkOrder, MilpTimeline>): number {
    if (!orders.length || timelines.size < 1) return 0;
    const orderCapacityByWorkorder = new Map<WorkOrder, number>();
    orders.forEach((order) => orderCapacityByWorkorder.set(order.workOrder, order.capacity));
    let total = 0;
    timelines.forEach((_, workorder) => {
        total += orderCapacityByWorkorder.get(workorder) || 0;
    });
    return total;
}
