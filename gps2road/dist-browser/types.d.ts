import type { Feature, FeatureCollection } from 'geojson';
export declare type RoadNameProperties = {
    geofulladdress: string;
    rcl_nguid: string;
    source_datasetid: string;
};
export declare type RoadType = 'INTERSTATE' | 'STATE' | 'LOCAL' | 'UNKNOWN';
export declare type RoadTypeInfo = {
    name: string;
    type: RoadType;
    number?: string;
    ramp?: true;
};
export declare type RoadGeoJSON = Feature & {
    properties: RoadNameProperties;
};
export declare type RoadCollectionGeoJSON = FeatureCollection & {
    features: RoadGeoJSON[];
};
export declare function assertRoadGeoJSON(obj: any): asserts obj is RoadGeoJSON;
export declare function assertRoadCollectionGeoJSON(obj: any): asserts obj is RoadCollectionGeoJSON;
