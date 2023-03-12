import type { GeoJSON, Feature, Point as GeoJSONPoint, FeatureCollection } from 'geojson';
export type MileMarkerProperties = {
    POST_NAME: string;
};
export type MileMarkerFeature = Feature<GeoJSONPoint> & {
    properties: MileMarkerProperties;
};
export type MileMarkerGeoJSON = FeatureCollection & {
    features: MileMarkerFeature[];
};
export type IndexedMileMarkers = {
    [roadname_prefix: string]: MileMarker[];
};
export type Point = {
    lat: number;
    lon: number;
};
export type MileMarker = Point & {
    name: string;
    number: number;
};
export type Road = RoadTypeInfo & {
    mileMarkers?: {
        min: MileMarker;
        max: MileMarker;
    };
    geojson?: GeoJSON;
};
export type PointWithRoad = {
    point: Point;
    road: Road;
};
export type RoadNameProperties = {
    geofulladdress: string;
    rcl_nguid: string;
    source_datasetid: string;
};
export type RoadType = 'INTERSTATE' | 'STATE' | 'LOCAL' | 'UNKNOWN';
export type RoadTypeInfo = {
    name: string;
    type: RoadType;
    number?: string;
    ramp?: true;
};
export type RoadGeoJSON = Feature & {
    properties: RoadNameProperties;
};
export type RoadCollectionGeoJSON = FeatureCollection & {
    features: RoadGeoJSON[];
};
export declare function assertRoadGeoJSON(obj: any): asserts obj is RoadGeoJSON;
export declare function assertRoadCollectionGeoJSON(obj: any): asserts obj is RoadCollectionGeoJSON;
export declare function assertMileMarkerProperties(obj: any): asserts obj is MileMarkerProperties;
export declare function assertMileMarkerFeature(obj: any): asserts obj is MileMarkerFeature;
export declare function assertMilemarkerGeoJSON(obj: any): asserts obj is MileMarkerGeoJSON;
