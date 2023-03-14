export * as roadnames from './roadnames.js';
export * as geohash from './geohash.js';
export * from './types.js';
import type { Point, Road } from './types.js';
export { setBaseUrl, fetchMileMarkersForRoad } from './fetch.js';
export declare function gps2road({ point, hintroad }: {
    point: Point;
    hintroad?: Road | null;
}): Promise<Road | null>;
