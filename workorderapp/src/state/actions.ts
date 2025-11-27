import { runInAction, action } from 'mobx';
import { state, ActivityMessage, ParsingState, VehicleDayTrackSeg } from './state';
import log from '../log';
import type { FeatureCollection, GeoJSON, Position } from 'geojson';
import { assertWorkOrder, DayTracks, WorkOrder, VehicleDayTrack } from '@track-patch/lib';
import readtracks from './readtracks-worker.js'; // I couldn't get this to work as a worker
import xlsx from 'xlsx-js-style';
import numeral from 'numeral';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { FileReader } from '@tanker/file-reader';
import { downloadBlob } from './downloadBlob';
import {
    assertRoadSegment,
    computePointsOnRoadSegmentForVehicleOnDay,
    computeSecondsOnRoadSegmentForVehicleOnDay,
    saveWorkorders,
    computeIdealTimeForVehicleOnDay,
    computeIdealPointsForVehicleOnDay
} from './workorder_helpers';
import { vehicleidFromResourceName } from './workorder_utils';
import { assignMilpTimelines } from './milp';
import allRoadSegments from './workorder_roadsegments.json';
import { LineString } from '@turf/turf';
import { mapRef } from '../Map';

dayjs.extend(customParseFormat);
const { info, warn } = log.get("actions");

//--------------------------------------------------------------------
// GeoJSON, Roads, and MileMarkers
//--------------------------------------------------------------------

// Helper function to fetch a geojson asset:

const loadGeoJSON = action('loadGeoJSON', async (path: string): Promise<GeoJSON | null> => {
    try {
        const response = await fetch(`./${path}`);
        info('Fetch returned');
        if (response.status >= 400) throw new Error(`Failed to fetch data from ${path}`);
        info('Getting JSON from response');
        return await response.json();
    } catch (e: any) {
        warn('ERROR: failed to fetch roads data.  Error was: ', e);
        activity(`ERROR: Failed to fetch and load roads.geojson, error was: ${e.toString()}`);
    }
    return null;
});

let _roads: GeoJSON | null = null;
export function roads() { return _roads; }
export const loadRoads = action('loadRoads', async (filename: string) => {
    _roads = await loadGeoJSON(`roads-by-geohash/${filename}`);
    runInAction(() => { state.roads.rev++ });
});
export const loadRoadsForTrack = action('loadRoadsForFilteredTrack', async () => {

});

let _milemarkers: GeoJSON | null = null;
export function milemarkers() { return _milemarkers; }
export const loadMilemarkers = action('loadMilemarkers', async () => {
    _milemarkers = await loadGeoJSON('milemarkers.geojson');
    runInAction(() => { state.milemarkers.rev++ });
});


//---------------------------------------------------
// GeoJSON visualizations
//---------------------------------------------------

export const selectGeojsonVizFile = action('selectGeojsonVizFile', async (filename: string) => {
    state.geojsonviz.selectedFile = filename;
    activity(`Loading roads from ${filename}`);
    await loadRoads(filename);
    activity('Done loading roads');
});

export const search = action('search', async (search: string) => {
    state.search = search;
});



//---------------------------------------------------
// Basic State updates
//---------------------------------------------------

export const page = action('page', (page: typeof state.page): void => {
    state.page = page;
});

export const setViewport = action('setViewport', (viewport: typeof state.viewport) => {
    state.viewport = viewport;
    if (mapRef) {
        mapRef.current?.fitBounds([viewport.longitude, viewport.latitude]);
    }
});

export const recenterMapOnFilteredGeoJSON = action('recenterMapOnFilteredGeoJSON', () => {
    const tracks = filteredGeoJSON();
    if (!tracks || tracks.features.length > 0) return;
    const allCoordinates = tracks.features.reduce((acc, feature) => {
        const coordinates = (feature.geometry as LineString).coordinates;
        return acc.concat(coordinates);
    }, [] as Position[]);

    const minLongitude = Math.min(...allCoordinates.map(coord => coord[0]));
    const maxLongitude = Math.max(...allCoordinates.map(coord => coord[0]));
    const minLatitude = Math.min(...allCoordinates.map(coord => coord[1]));
    const maxLatitude = Math.max(...allCoordinates.map(coord => coord[1]));

    const longitude = (minLongitude + maxLongitude) / 2;
    const latitude = (minLatitude + maxLatitude) / 2;
    const zoom = Math.max(
        0,
        Math.min(
            20,
            Math.log2(360 / ((maxLongitude - minLongitude) * Math.cos((maxLatitude + minLatitude) / 2 * Math.PI / 180))) - 1
        )
    );

    setViewport({
        ...state.viewport,
        longitude,
        latitude,
        zoom: Math.floor(zoom), // Adjust zoom level as necessary
    });
})

export const popActivity = action('popActivity', () => {
    if (state.activityLog.length < 1) return;
    state.activityLog = state.activityLog.slice(1);
});
export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
    if (!Array.isArray(msg)) {
        msg = [msg] as string[] | ActivityMessage[];
    }
    // Make sure evey element is an activity message (convert strings):
    let msgs: ActivityMessage[] = msg.map((m: any) => {
        if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
            return m as ActivityMessage;
        } else {
            return { msg: m, type } as ActivityMessage;
        }
    });
    info(msgs.map(m => m.msg).join('\n'));
    state.activityLog = [...state.activityLog, ...msgs];
    setTimeout(popActivity, 5000);
});


//-------------------------------------------------------------------
// Basic View interaction
//-------------------------------------------------------------------

export const hover = action('hover', (hover: typeof state['hover']): void => {
    state.hover = hover;
});

//----------------------------------------------------------------
// Parsing the big tracks file
//----------------------------------------------------------------

export const parsingInProgress = action('parsingInProgress', (val: typeof state['parsing']['inprogress']): void => {
    state.parsing.inprogress = val;
});
export const parsingEstimatedRows = action('parsingEstimatedRows', (val: typeof state['parsing']['estimatedRows']): void => {
    state.parsing.estimatedRows = val;
});
export const parsingCurrentNumRows = action('parsingCurrentNumRows', (val: typeof state['parsing']['currentNumRows']): void => {
    state.parsing.currentNumRows = val;
});
export const parsingState = action('parsingState', (val: ParsingState) => {
    state.parsing.state = val;
});


let _daytracks: DayTracks | null = null;
export function daytracks() { return _daytracks; }

let _daytracksGeojson: FeatureCollection | null = null;
export function daytracksGeoJSON() { return _daytracksGeojson; }

function getVehicleDayTrack(vehicleid: number, day: string): VehicleDayTrack | undefined {
    if (!_daytracks) return undefined;
    const vehicles = _daytracks[day];
    if (!vehicles) return undefined;
    return vehicles[vehicleid] || vehicles[vehicleid.toString()];
}

// This populates both _daytracks and _daytracksGeojson
export const loadDayTracks = action('loadDayTracks', async ({ file, jsonstr }: { file?: File, jsonstr?: string }) => {
    if (!file && !jsonstr) throw new Error('ERROR: did not pass either file or json to loadDayTracks');
    if (!file) {
        file = new File([""], "ProcessedTracks.json");
    }
    let filesize = file.size;
    if (jsonstr) filesize = jsonstr.length;
    parsingInProgress(true);
    parsingEstimatedRows(filesize / 240); // seems to be around 240 bytes/record


    // Read the already-processes JSON tracks
    if (file.name.match(/\.json$/) || jsonstr) {
        info('Parsing input file', file.name, 'as JSON...');
        parsingState('preprocessed');
        parsingInProgress(true);
        try {
            let resultstr = jsonstr;
            if (!resultstr) {
                const f = new FileReader(file);
                resultstr = await f.readAsText();
            }
            const result = JSON.parse(resultstr);
            if (!result || typeof result.daytracks !== 'object') {
                throw new Error('No daytracks present.');
            }
            if (typeof result.daytracksGeoJSON !== 'object') {
                throw new Error('No daytracksGeoJSON present.');
            }
            _daytracks = result.daytracks as DayTracks;

            _daytracksGeojson = result.daytracksGeoJSON as FeatureCollection;
            // Count number of points from VehicleDayTracks
            let numpoints = 0;
            for (const vehicles of Object.values(_daytracks)) {   // { '2023-01-01': { '61001': { id: '...', ..., track: [ ...points... ] } } }
                for (const vehicle_info of Object.values(vehicles)) {
                    numpoints += vehicle_info.track.length;
                    // Convert all the "time" fields back to dayjs:
                    for (const p of vehicle_info.track) {
                        if (typeof p.time === 'string') {
                            p.time = dayjs(p.time);
                        }
                    }
                }
            }
            runInAction(() => state.daytracks.rev++);
            runInAction(() => state.daytracksGeoJSON.rev++);
            parsingCurrentNumRows(numpoints);
            parsingEstimatedRows(numpoints);
            parsingState('done');
            parsingInProgress(false);
        } catch (e: any) {
            warn('FAIL: could not parse pre-processed JSON file.  Error was: ', e);
            parsingState('error');
            parsingInProgress(false);
        }
        return; // rest of parsing code is for CSV
    }

    const result = await readtracks({
        file,
        numRowsParsed: parsingCurrentNumRows,
        parsingState,
    });
    _daytracks = result.daytracks;
    _daytracksGeojson = result.daytracksGeoJSON;

    parsingEstimatedRows(state.parsing.currentNumRows); // make sure progress bar is finished
    activity('Parsing complete!');
    parsingInProgress(false);
    info('Parsing complete, days = ', _daytracks);
    runInAction(() => { state.daytracks.rev++ });
    runInAction(() => { state.daytracksGeoJSON.rev++ });
});

export const exportProcessedTracks = action('exportProcessedTracks', async () => {
    const output = {
        daytracks: _daytracks,
        daytracksGeoJSON: _daytracksGeojson,
    };
    const blob = new Blob([JSON.stringify(output)], { type: 'application/json' });
    info('Downloading processed tracks...');
    downloadBlob(blob, 'processed-tracks.json');
});

//-----------------------------------------------------------
// Work Orders (spreadsheet):
//-----------------------------------------------------------

let _knownWorkorders: WorkOrder[] | null = null;
export function knownWorkorders() { return _knownWorkorders };
export function numKnownWorkorders() { return _knownWorkorders ? _knownWorkorders.length : 0 }
export const loadKnownWorkorders = action('loadKnownWorkorders', async ({ file, arraybuffer }: { file?: File, arraybuffer?: ArrayBuffer }) => {
    if (!file && !arraybuffer) throw new Error('ERROR: did not pass either file or arraybuffer to loadKnownWorkorders');
    if (file) {
        arraybuffer = await file.arrayBuffer();
    }
    knownWorkOrdersParsing(true);
    info('Reading workorders file...');
    const wb = xlsx.read(arraybuffer);
    info('sheet_to_json workorders...');
    const records = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });
    info('assert proper workorders...');
    _knownWorkorders = records.filter((r, index) => {
        try {
            assertWorkOrder(r);
        } catch (e: any) {
            info('WARNING: line', index + 1, 'in work orders sheet was not a valid work order:', e.message);
            return false;
        }
        return true;
    }) as WorkOrder[];
    runInAction(() => { state.knownWorkorders.orders.rev++ });
    knownWorkOrdersParsing(false);
});
export const knownWorkOrdersParsing = action('knownWorkOrdersParsing', async (val: boolean) => {
    state.knownWorkorders.parsing = val;
});

//-----------------------------------------------------------
// Validate Work Orders (spreadsheet):
//-----------------------------------------------------------

let _filteredknownWorkorders: WorkOrder[] | null = null;
export function filteredknownWorkorders() { return _filteredknownWorkorders };
export const validateWorkorders = action('validateWorkorders', async (opts?: { nosave?: true }) => {
    opts = opts || {};
    if (!_knownWorkorders) throw new Error('No work orders to validate');

    for (const r of _knownWorkorders) {

        if (r['Resource Type'] !== 'Equipment') {
            info('Resource Type', r['Resource Type'], 'is not Equipment');
            continue; // this is the only thing we can identify right now
        }

        if (!r['Total Hrs']) {
            info('No Total Hrs');
            continue; // no reported hours means we skip this one
        }
        const reported_hours = +(r['Total Hrs']);
        if (isNaN(reported_hours)) {
            info('Reported hours isNaN');
            continue;
        }

        const vid = vehicleidFromResourceName(r['Resource Name'] || '')
        if (!vid) {
            info('Unable to find vehicle id', vid, 'in Resource Name', r['Resource Name']);
            continue; // we don't recognize this equipment number
        }

        const workorderday = dayjs(r['Work Date'], 'M/D/YY');
        if (!workorderday.isValid()) {
            info('Work Date', r['Work Date'], 'invalid');
            continue; // invalid dates don't work either
        }
        const day = workorderday.format('YYYY-MM-DD');
        const computedSeconds = await computeSecondsOnRoadSegmentForVehicleOnDay({ seg: r, vehicleid: vid, day: day });
        const computedIdealHrs = await computeIdealTimeForVehicleOnDay({ vehicleid: vid, day })
        const computedHours = computedSeconds / 3600;
        const match = computedHours ? reported_hours / computedHours : 0;
        r.match = numeral(match).format('0,0.00%');
        r.computedHours = numeral(computedHours).format('0,0.00');
        r.differenceHours = numeral(reported_hours - computedHours).format('0,0.00');
        r.computedIdealHrs = numeral(computedIdealHrs / 3600).format('0,0.00');
        info('WE ACTUALLY HAVE A COMPUTED HOURS!!!', computedHours);
    }
    _filteredknownWorkorders = _knownWorkorders.filter(w => w.computedHours && +(w.computedHours) > 0)
    const equipmentOnly = _knownWorkorders.filter(w => (w['Resource Type'] || '').toLowerCase() === 'equipment');
    await applyMilpToWorkorders(equipmentOnly, 'validated');
    autoSelectFirstValidatedRecord();
    if (!opts.nosave) {
        saveWorkorders('validated-workorders.xlsx', _knownWorkorders.filter(w => w.computedHours && +(w.computedHours) > 0));
    }
});


let _filteredDayTracks: DayTracks | null = null;
export function filteredDayTracks() { return _filteredDayTracks; }
export const filterDayTracks = action('filterDayTracks', ({ vehicleid, day }: { vehicleid: string, day: string }) => {
    if (!_daytracks) {
        _filteredDayTracks = null;
        return;
    }
    _filteredDayTracks = {};
    const daytrack = _daytracks[day];
    if (!daytracks) return;
    const vdt = daytrack[vehicleid];
    if (!vdt) return;
    _filteredDayTracks[day] = { [vehicleid]: vdt };
    runInAction(() => { state.filteredDayTracks.rev++ });

});

let _filteredGeoJSON: FeatureCollection | null = null;
export function filteredGeoJSON() { return _filteredGeoJSON; }
export const filterGeoJSON = action('filterGeoJSON', ({ vid, day }: { vid: string, day: string }) => {
    if (!_daytracksGeojson) {
        _filteredDayTracks = null;
        return;
    }

    // Filter the daytracksGeoJSON based on vid and day
    const filteredFeatures = _daytracksGeojson.features.filter(feature => {
        // Check if the feature belongs to the specified vid and day
        return feature.properties?.vid === vid && feature.properties?.day === day;
    });

    // Create a new FeatureCollection with the filtered features
    const filteredGeoJSON: FeatureCollection = {
        type: 'FeatureCollection',
        features: filteredFeatures,
    };

    // Update the filteredGeoJSON state
    runInAction(() => { _filteredGeoJSON = filteredGeoJSON; });
    runInAction(() => { state.filteredGeoJSON.rev++ });
    recenterMapOnFilteredGeoJSON();
});

//-----------------------------------------------------------
// Update Side Panel for Work Orders:
//-----------------------------------------------------------

export const getDateList = action(() => {
    if (!_daytracks) return [];
    const dates = Object.keys(_daytracks);
    return dates.sort();
});

export const getVehicleIDsForDate = action((date: string) => {
    if (!_daytracks || !_daytracks[date]) return [];

    const worders = _filteredknownWorkorders;

    if (worders) {
        const vehicleDataMap = new Map<string, { computedHrs: number, totalHrs: number }>();

        // Filter work orders by date
        const wordersForDate = worders.filter(wo => dayjs(wo['Work Date'], 'M/D/YY').format('YYYY-MM-DD') === date);

        wordersForDate.forEach(wo => {
            const vehicleId = vehicleidFromResourceName(wo['Resource Name'] || '').toString();
            const computedHrs = parseFloat(wo.computedIdealHrs || '0');
            const totalHrs = parseFloat(wo['Total Hrs'] || '0');

            if (!vehicleDataMap.has(vehicleId)) {
                vehicleDataMap.set(vehicleId, { computedHrs: computedHrs, totalHrs: 0 });
            }

            const existingData = vehicleDataMap.get(vehicleId);
            if (existingData) {
                vehicleDataMap.set(vehicleId, {
                    computedHrs: existingData.computedHrs,
                    totalHrs: existingData.totalHrs + totalHrs
                });
            }
        });

        return Object.entries(_daytracks[date])
            .filter(([vehicleId]) => vehicleDataMap.has(vehicleId))
            .map(([vehicleId, vehicleData]) => {
                const { computedHrs, totalHrs } = vehicleDataMap.get(vehicleId) || { computedHrs: 0, totalHrs: 0 };

                return {
                    vehicleId,
                    count: vehicleData.track.length, // Assuming `track` is an array of points
                    computedHrs,
                    totalHrs
                };
            });
    } else {
        return Object.entries(_daytracks[date]).map(([vehicleId, vehicleData]) => ({
            vehicleId,
            count: vehicleData.track.length, // Assuming `track` is an array of points
            computedHrs: 0,
            totalHrs: 0 // Default computed and total hours when knownWorkorders is null
        }));
    }
});

export const updateChosenDate = action('updateChosenDate', (date: string | null) => {
    state.chosenDate = date;
});

export const updateChosenVehicleID = action('updateChosenVehicleID', (vehicleID: string | null) => {
    state.chosenVehicleID = vehicleID;
});

export const updateSegment = action('updateSegment', (segment: string | null) => {
    state.chosenSegment = segment;
});

//---------------------------------------------------------------------
// Creating work orders from a list of vehicles with activity and day
//---------------------------------------------------------------------
export type VehicleActivity = {
    'Resource Name': string,
    'Activity': string,
    'Subactivity': string,
    'Work Date': string,
};
export function assertVehicleActivity(o: any): asserts o is VehicleActivity {
    if (!o || typeof o !== 'object') throw `assertVehicleActivity: must be an object`;
    if (typeof o['Resource Name'] !== 'string') throw `assertVehicleActivity: must have a Resource Name`;
    if (typeof o['Activity'] !== 'string') throw `assertVehicleActivity: must have a Activity`;
    if (typeof o['Subactivity'] !== 'string') throw `assertVehicleActivity: must have a Subactivity`;
    if (typeof o['Work Date'] !== 'string') throw `assertVehicleActivity: must have a Work Date`;
    if ('Total Hrs' in o && typeof o['Total Hrs'] !== 'number') throw `assertVehicleActivity: if Total Hrs is present, it must be a number`;
}
let _vehicleActivities: VehicleActivity[] | null = null;
export const vehicleActivities = action('vehicleActivities', () => {
    return _vehicleActivities;
});
export const loadVehicleActivities = action('loadVehicleActivities', async ({ file, arraybuffer }: { file?: File, arraybuffer?: ArrayBuffer }) => {
    if (!file && !arraybuffer) throw new Error('ERROR: did not pass either file or arraybuffer to loadKnownWorkorders');
    if (file) {
        arraybuffer = await file.arrayBuffer();
    }
    runInAction(() => { state.createdWorkOrders.parsing = true; });
    const wb = xlsx.read(arraybuffer);
    const records = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });
    _vehicleActivities = records.filter((r, index) => {
        try {
            assertVehicleActivity(r);
        } catch (e: any) {
            info('WARNING: line', index + 1, 'in vehicle activities sheet', r, 'was not a valid vehicle activity:', e);
            return false;
        }
        return true;
    }) as VehicleActivity[];
    runInAction(() => { state.createdWorkOrders.vehicleActivities.rev++ });
    runInAction(() => { state.createdWorkOrders.parsing = false; });
});

export const getSegmentGeoJSON = action('getSegmentGeoJSON', (input: VehicleDayTrackSeg, color: string): FeatureCollection => {
    if (!input || !input.track || !Array.isArray(input.track)) {
        throw new Error("Invalid input format.");
    }

    const featureCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {
                    vid: String(input.vid),
                    day: input.day,
                    color: color ? color : '#ff0000',
                },
                geometry: {
                    type: "LineString",
                    coordinates: input.track,
                },
            },
        ],
    };

    return featureCollection;
});

let _segPointsMap: Map<string, FeatureCollection> = new Map<string, FeatureCollection>();
export const segPointsMap = action('segPointsMap', (input: string | null): FeatureCollection => {
    if (input){
        const featureCollection = _segPointsMap.get(input);
        if (!featureCollection) {
            throw new Error(`No feature collection found for input: ${input}`);
        }
        return featureCollection;
    }
    else {
        throw new Error("Input inventory string is null")
        
    }
});

let _segPointsTime: Map<string, string> = new Map<string, string>();
export const segPointsTime = action('segPointsTime', (input: string | null): string => {
    if (input){
        const time = _segPointsTime.get(input);
        if (!time) {
            throw new Error(`No time found for input: ${input}`);
        }
        return time;
    }
    else {
        throw new Error("Input inventory string is null")
        
    }
});


let _createdWorkOrders: WorkOrder[] | null = null;
export const createdWorkOrders = action('createdWorkOrders', () => _createdWorkOrders);

export const createWorkOrders = action('createWorkorders', async (opts?: { nosave?: true }) => {
    opts = opts || {};
    if (!_vehicleActivities) {
        info('createWorkorders: No vehicleActivities to work with');
        return;
    }
    runInAction(() => { state.createdWorkOrders.processing = true; });
    _createdWorkOrders = [];
    try {
        for (const va of _vehicleActivities) {
            const vehicleid = vehicleidFromResourceName(va['Resource Name']);
            const date = dayjs(va['Work Date'], 'M/D/YY');
            if (!date.isValid()) {
                info('Work Date', va['Work Date'], 'invalid');
                continue; // invalid dates don't work
            }
            const day = date.format('YYYY-MM-DD');
            const computedIdealPoints = await computeIdealPointsForVehicleOnDay({ vehicleid: vehicleid, day: day });
            if (computedIdealPoints) {
                _segPointsMap?.set(String(vehicleid) + '-' + String(day) + '-' + 'IDEAL', getSegmentGeoJSON(computedIdealPoints, '#ff0000'));
            }
            for (const seg of Object.values(allRoadSegments)) {
                assertRoadSegment(seg);

                const computedSeconds = await computeSecondsOnRoadSegmentForVehicleOnDay({ seg: seg, vehicleid: vehicleid, day: day });

                if (computedSeconds) {
                    const computedPoints = await computePointsOnRoadSegmentForVehicleOnDay({ seg: seg, vehicleid: vehicleid, day: day });
                    if (computedPoints) {
                        _segPointsMap?.set(String(vehicleid) + '-' + String(day) + '-' + seg['Inventory Asset'], getSegmentGeoJSON(computedPoints, '#ff0000'));
                        if (computedPoints.st && computedPoints.et) {
                            _segPointsTime?.set(String(vehicleid) + '-' + String(day) + '-' + seg['Inventory Asset'], computedPoints.st.format('HH:mm:ss') + '-' + computedPoints.et.format('HH:mm:ss'));
                        }
                    }
                    _createdWorkOrders.push({
                        ...va,
                        ...seg,
                        'computedHours': '' + (computedSeconds / 3600.0).toFixed(2),
                        'Measurement Unit': 'MHR - WORK HR',
                        'Resource Type': 'Equipment',
                        'Asset Type': 'Snow Route', // I think this probably should have been with the road segment originally.  Hardcoding for now.  TODO
                        'WO#': '',
                    });
                }
            }
        }
        info('Created work orders: ', _createdWorkOrders);
        runInAction(() => state.createdWorkOrders.workorders.rev++);
        await applyMilpToWorkorders(_createdWorkOrders, 'created');
        if (!opts.nosave) {
            saveWorkorders('created-workorders.xlsx', _createdWorkOrders);
        }
    } finally {
        runInAction(() => { state.createdWorkOrders.processing = false; });
    }
});

async function applyMilpToWorkorders(target: WorkOrder[] | null, label: string) {
    if (!target || target.length < 1) return;
    const { assignments, summary } = await assignMilpTimelines({
        workorders: target,
        getTrack: getVehicleDayTrack,
    });
    assignments.forEach((timeline, workorder) => {
        workorder['Assigned Hrs'] = numeral(timeline.assignedHours).format('0,0.00');
        workorder['Computed Start Time'] = timeline.start ? timeline.start.format('YYYY-MM-DD HH:mm:ss') : '';
        workorder['Computed End Time'] = timeline.end ? timeline.end.format('YYYY-MM-DD HH:mm:ss') : '';
    });
    if (summary.totalReportedHours > 0 || summary.totalGpsHours > 0) {
        const workCoverage = summary.totalReportedHours > 0 ? (summary.assignedHours / summary.totalReportedHours) * 100 : 0;
        const gpsCoverage = summary.totalGpsHours > 0 ? (summary.assignedHours / summary.totalGpsHours) * 100 : 0;
        activity(`MILP (${label}) coverage: ${workCoverage.toFixed(1)}% of reported hours, ${gpsCoverage.toFixed(1)}% of GPS availability`);
    }
}

function autoSelectFirstValidatedRecord() {
    if (state.chosenDate) return;
    if (!_knownWorkorders || _knownWorkorders.length < 1) return;
    const sorted = [..._knownWorkorders].sort((a, b) => {
        const ad = dayjs(a['Work Date'], 'M/D/YY');
        const bd = dayjs(b['Work Date'], 'M/D/YY');
        return ad.valueOf() - bd.valueOf();
    });
    const candidate = sorted.find((wo) => {
        const vid = vehicleidFromResourceName(wo['Resource Name'] || '');
        return vid && dayjs(wo['Work Date'], 'M/D/YY').isValid();
    });
    if (!candidate) return;
    const vid = vehicleidFromResourceName(candidate['Resource Name'] || '').toString();
    const date = dayjs(candidate['Work Date'], 'M/D/YY').format('YYYY-MM-DD');
    if (!vid || !date) return;
    runInAction(() => {
        state.chosenDate = date;
        state.chosenVehicleID = vid;
    });
    filterDayTracks({ vehicleid: vid, day: date });
    filterGeoJSON({ vid, day: date });
}

//-----------------------------------------------------------
// Making Analysis Table for Work Orders:
//-----------------------------------------------------------

interface WorkOrderData {
    routeRef: string;
    inventoryAsset: string;
    computedHours: string | number;
    reportedHours: string | number;
    computedStart?: string;
    computedEnd?: string;
}

export const getAnalysisData = action('getAnalysisData', ({ vehicleid, date }: { vehicleid: string, date: string }) => {
    const createWorkOrderData = createdWorkOrders();
    const filteredknownWorkorderData = filteredknownWorkorders();

    if (createWorkOrderData && filteredknownWorkorderData && createWorkOrderData.length > 0 && filteredknownWorkorderData.length > 0) {
        const mergedData: WorkOrderData[] = [];

        const processWorkOrder = ({ workorder, source }: { workorder: WorkOrder | null, source: 'known' | 'created' }) => {
            if (
                workorder && dayjs(workorder['Work Date'], 'M/D/YY').format('YYYY-MM-DD') === date &&
                vehicleidFromResourceName(workorder['Resource Name']) === ~~vehicleid
            ) {
                mergedData.push({
                    routeRef: workorder['Route (Ref)'] || 'NA',
                    inventoryAsset: workorder['Inventory Asset'] || 'NA',
                    computedHours: source === 'created' ? workorder['computedHours'] || 'NA' : 'NA',
                    reportedHours: source === 'known' ? workorder['Total Hrs'] || 'NA' : 'NA',
                    computedStart: source === 'created' ? (workorder['Computed Start Time'] as string) || '' : '',
                    computedEnd: source === 'created' ? (workorder['Computed End Time'] as string) || '' : '',
                });
            }
        };

        filteredknownWorkorderData.forEach((workorder) => processWorkOrder({ workorder: workorder, source: 'known' }));
        createWorkOrderData.forEach((workorder) => processWorkOrder({ workorder: workorder, source: 'created' }));

        const inventorySet = new Set(mergedData.map((item) => item.inventoryAsset));
        const finalData = Array.from(inventorySet).map((inventoryAsset) => {
            const rowsForAsset = mergedData.filter(
                (item) => item.inventoryAsset === inventoryAsset
            );
            const computedRow = rowsForAsset.find((item) => item.computedHours !== 'NA');
            const reportedRow = rowsForAsset.find((item) => item.reportedHours !== 'NA');
            const computedStartTimes = rowsForAsset
                .map((item) => item.computedStart)
                .filter((val): val is string => Boolean(val));
            const computedEndTimes = rowsForAsset
                .map((item) => item.computedEnd)
                .filter((val): val is string => Boolean(val));
            const toEarliest = (values: string[]) => {
                if (!values.length) return '';
                return values.reduce((earliest, current) => {
                    if (!earliest) return current;
                    if (!current) return earliest;
                    return dayjs(current).isBefore(dayjs(earliest)) ? current : earliest;
                }, values[0]!);
            };
            const toLatest = (values: string[]) => {
                if (!values.length) return '';
                return values.reduce((latest, current) => {
                    if (!latest) return current;
                    if (!current) return latest;
                    return dayjs(current).isAfter(dayjs(latest)) ? current : latest;
                }, values[0]!);
            };
            return {
                routeRef: rowsForAsset[0]?.routeRef || 'NA',
                inventoryAsset: inventoryAsset,
                computedHours: computedRow?.computedHours || 'NA',
                reportedHours: reportedRow?.reportedHours || 'NA',
                computedStart: toEarliest(computedStartTimes),
                computedEnd: toLatest(computedEndTimes),
            };
        });
        return finalData;

    } else {
        info("Something is wrong. Either created workorders or validated work order is empty!")
    }
});
