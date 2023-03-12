import { Point, RoadCollectionGeoJSON, IndexedMileMarkers, Road, MileMarker } from './types.js';
export declare function fetchRoadTilesByGeohashes(geohashes: string[]): Promise<RoadCollectionGeoJSON[]>;
export declare function fetchRoadTilesForPoint(point: Point): Promise<RoadCollectionGeoJSON[]>;
export declare function fetchIndexedMileMarkers(): Promise<IndexedMileMarkers>;
export declare function fetchMileMarkersForRoad({ road }: {
    road: Road;
}): Promise<MileMarker[]>;
