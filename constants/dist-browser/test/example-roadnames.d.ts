import type { RoadType, RoadTypeInfo } from '../roadnames.js';
declare type RawExampleRoadnames = {
    [name: string]: string | {
        type: RoadType;
        number?: string;
        ramp?: true;
    };
};
export declare type ExampleRoadNames = {
    [name: string]: RoadTypeInfo;
};
export declare const _roadnames: RawExampleRoadnames;
export declare const exampleRoadnames: {
    [name: string]: RoadTypeInfo;
};
export {};
