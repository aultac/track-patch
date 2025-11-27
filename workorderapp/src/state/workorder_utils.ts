import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const DATE_FORMATS = ['M/D/YY', 'M/D/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'];

export function vehicleidFromResourceName(name: string): number {
    const vid = +(name?.split('-')[0]?.trim().replace(/^0+/, ''));
    if (isNaN(vid)) return 0;
    return vid;
}

export function parseWorkDate(value: string | undefined): Dayjs | null {
    if (!value) return null;
    for (const fmt of DATE_FORMATS) {
        const parsed = dayjs(value, fmt, true);
        if (parsed.isValid()) return parsed;
    }
    const fallback = dayjs(value);
    if (fallback.isValid()) return fallback;
    return null;
}

export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

