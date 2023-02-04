export declare type RoadNameInfo = {
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
export declare function guessRoadType(road: RoadNameInfo): RoadTypeInfo;
export declare function roadNameToType(geofulladdress: string): RoadTypeInfo;
