import type { GeoJSON, Feature, Point as GeoJSONPoint, FeatureCollection } from 'geojson';

export type MileMarkerProperties = {
  POST_NAME: string,
};
export type MileMarkerFeature = Feature<GeoJSONPoint> & {
  properties: MileMarkerProperties,
};
export type MileMarkerGeoJSON = FeatureCollection & {
  features: MileMarkerFeature[],
};
// Converted out of GeoJSON and into our structure
export type IndexedMileMarkers = {
  [roadname_prefix: string]: MileMarker[], // sorted
};

export type Point = {
  lat: number,
  lon: number,
};

export type MileMarker = Point & {
  name: string,
  number: number,
};

export type Road = RoadTypeInfo & {
  mileMarkers?: {
    min: MileMarker,
    max: MileMarker,
  },
  geojson?: GeoJSON,
};


export type PointWithRoad = {
  point: Point,
  road: Road,
};

export type RoadNameProperties = {
  geofulladdress: string, // this is the main thing
  rcl_nguid: string,
  source_datasetid: string,
};

export type RoadType = 'INTERSTATE' | 'STATE' | 'LOCAL' | 'UNKNOWN';

export type RoadTypeInfo = {
  name: string,
  type: RoadType,
  number?: string,
  ramp?: true,
};

export type RoadGeoJSON = Feature & {
  properties: RoadNameProperties
};

export type RoadCollectionGeoJSON = FeatureCollection & {
  features: RoadGeoJSON[],
};

export function assertRoadGeoJSON(obj: any): asserts obj is RoadGeoJSON {
  if (!obj || typeof obj !== 'object') throw `assertRoadGeoJSON: value is not an object or is null`;
  if (obj.type !== 'Feature') throw `assertRoadGeoJSON: value has no type key with value 'Features'`;
  if (!obj.properties) throw `assertRoadGeoJSON: has no properties`;
  if (!obj.properties.geofulladdress) throw `assertRoadGeoJSON: properties has no geofulladdress`;
  if (!obj.properties.rcl_nguid) throw `assertRoadGeoJSON: properties has no rcl_nguid`;
  if (!obj.properties.source_datasetid) throw `assertRoadGeoJSON: properties has no source_datasetid`;
}

export function assertRoadCollectionGeoJSON(obj: any): asserts obj is RoadCollectionGeoJSON {
  if (!obj || typeof obj !== 'object') throw `assertRoadCollectionGeoJSON: value is not an object or is null`;
  if (obj.type !== 'FeatureCollection') throw `assertRoadCollectionGeoJSON: value has no type = 'FeatureCollection'`;
  if (!obj.features || !Array.isArray(obj.features)) throw `assertRoadCollectionGeoJSON: features does not exist or is not an array`;
  for (const [ index, f ] of obj.features.entries()) {
    try { assertRoadGeoJSON(f) }
    catch (e: any) { 
      throw `assertRoadCollectionGeoJSON: feature at index ${index} failed assertRoadGeoJSON with error: ${e.toString()}`;
    }
  }
}

export function assertMileMarkerProperties(obj: any): asserts obj is MileMarkerProperties {
  if (!obj) throw `cannot be falsey`;
  if (typeof obj !== 'object') throw `must be an object`;
  if (typeof obj.POST_NAME !== 'string') throw `POST_NAME property must be a string`;
}
export function assertMileMarkerFeature(obj: any): asserts obj is MileMarkerFeature {
  if (!obj) throw `cannot be falsey`;
  if (typeof obj !== 'object') throw `must be an object`;
  if (obj.type !== 'Point') throw `must be a Point feature`;
  assertMileMarkerProperties(obj.properties);
}
export function assertMilemarkerGeoJSON(obj: any): asserts obj is MileMarkerGeoJSON {
  if (!obj) throw `cannot be falsey`;
  if (typeof obj !== 'object') throw `must be an object`;
  if (!Array.isArray(obj.features)) throw `features must be an array`;
  for (const f of (obj.features as any[])) {
    assertMileMarkerFeature(f);
  }
}
