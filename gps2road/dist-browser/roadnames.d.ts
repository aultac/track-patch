import type { RoadNameProperties, RoadTypeInfo } from './types.js';
export declare function guessRoadType(road: RoadNameProperties): RoadTypeInfo;
export declare function roadNameToType(geofulladdress: string): RoadTypeInfo;
