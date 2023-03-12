import type { RoadType, RoadTypeInfo } from '../types.js';
type RawExampleRoadnames = {
    [name: string]: string | {
        type: RoadType;
        number?: string;
        ramp?: true;
    };
};
export type ExampleRoadNames = {
    [name: string]: RoadTypeInfo;
};
export declare const _roadnames: RawExampleRoadnames;
export declare const exampleRoadnames: {
    [name: string]: RoadTypeInfo;
};
export {};
