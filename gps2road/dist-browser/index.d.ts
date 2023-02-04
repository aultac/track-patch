export * as roadnames from './roadnames.js';
export * as geohash from './geohash.js';
import type { GeoJSON } from 'geojson';
import type { RoadTypeInfo } from './types.js';
export declare type MileMarker = {
    name: string;
    number: string;
    lat: number;
    lon: number;
};
export declare type RoadWithMileMarkers = RoadTypeInfo & {
    mileMarkers: {
        min: MileMarker;
        max: MileMarker;
    };
    geojson: GeoJSON;
};
export declare function gps2road(gps: {
    lat: number;
    lon: number;
}, nearbyRoads: GeoJSON[]): void;
