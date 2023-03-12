export * as roadnames from './roadnames.js';
export * as geohash from './geohash.js';
export * from './types.js';
import type { Point, Road } from './types.js';
export declare function gps2road({ point }: {
    point: Point;
}): Promise<Road | null>;
