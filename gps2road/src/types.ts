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
  milemarkers?: {
    min: {
      post: MileMarker,
      offset: number, // positive, less than 1, it's the number of miles the point was away from the min-numbered mile milemarker
    },
    max: {
      post: MileMarker,
      offset: number, // negative, between -1 and 0, it's the number of miles the point was away from the max-numbered milemarker
    },
  },
  geojson?: GeoJSON,
};

export function assertPoint(o: any): asserts o is Point {
  if (!o || typeof o !== 'object') throw new Error('Point must be an object');
  if (typeof o.lat !== 'number') throw new Error('Point.lat must be a number');
  if (typeof o.lon !== 'number') throw new Error('Point.lon must be a number');
};
export function assertMileMarker(o: any): asserts o is MileMarker {
  if (!o || typeof o !== 'object') throw new Error('MileMarker must be an object');
  if (typeof o.name !== 'string') throw new Error('MileMarker name must be a string');
  if (typeof o.number !== 'number') throw new Error('MileMarker number must be a number');
  assertPoint(o);
}
export function assertRoad(o: any): asserts o is Road {
  if (!o || typeof o !== 'object') throw new Error('Road must be an object');
  assertRoadTypeInfo(o)
  if ('milemarkers' in o) {
    if (!o.milemarkers || typeof o.milemarkers !== 'object') throw new Error('MileMarkers on a road must be an object');
    if (!('min' in o.milemarkers) || typeof o.milemarkers.min !== 'object' || !o.milemarkers.min) throw new Error('MileMarker in road must have a min');
    if (!('offset' in o.milemarkers.min) || typeof o.milemarkers.min.offset !== 'number') throw new Error(`MileMarker min must have an offset from the post`);
    if (!('post' in o.milemarkers.min)) throw new Error('min milemarker must have a post');
    assertMileMarker(o.milemarkers.min.post);
    if (!('max' in o.milemarkers) || typeof o.milemarkers.max !== 'object' || !o.milemarkers.max) throw new Error('MileMarker in road must have a max');
    if (!('offset' in o.milemarkers.max) || typeof o.milemarkers.max.offset !== 'number') throw new Error(`MileMarker max must have an offset from the post`);
    if (!('post' in o.milemarkers.max)) throw new Error('max milemarker must have a post');
    assertMileMarker(o.milemarkers.max)
  };
}


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
  number?: number,
  ramp?: true,
};

export function assertRoadTypeInfo(o: any): asserts o is RoadTypeInfo {
  if (!o || typeof o !== 'object') throw `assertRoadTypeInfo: must be an object`;
  if (typeof o.name !== 'string') throw `assertRoadTypeInfo: must have a name`;
  if (o.type !== 'INTERSTATE' && o.type !== 'STATE' && o.type !== 'LOCAL' && o.type !== 'UNKNOWN') throw `assertRoadTypeInfo: type ${o.type} must be either INTERSTATE, STATE, LOCAL, or UNKNOWN`;
  if (typeof o.number !== 'number') throw `assertRoadTypeInfo: road number must be an actual number`;
  if ('ramp' in o && typeof o.ramp !== 'boolean') throw `assertRoadTypeInfo: if ramp is present, it must be a boolean.  It is ${o.ramp} instead.`;
}

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
  if (!obj) throw new Error(`cannot be falsey`);
  if (typeof obj !== 'object') throw new Error(`must be an object`);
  if (typeof obj.POST_NAME !== 'string') throw new Error(`POST_NAME property must be a string`);
}
export function assertMileMarkerFeature(obj: any): asserts obj is MileMarkerFeature {
  if (!obj) throw new Error(`cannot be falsey`);
  if (typeof obj !== 'object') throw new Error(`must be an object`);
  if (obj.type !== 'Feature') throw new Error(`must be a GeoJSON feature`);
  if (!obj.geometry) throw new Error(`must have a geometry`);
  if (obj.geometry.type !== 'Point') throw new Error('Must be a point feature');
  assertMileMarkerProperties(obj.properties);
}
export function assertMilemarkerGeoJSON(obj: any): asserts obj is MileMarkerGeoJSON {
  if (!obj) throw new Error(`cannot be falsey`);
  if (typeof obj !== 'object') throw new Error(`must be an object`);
  if (obj.type !== 'FeatureCollection') throw new Error('must be a feature collection');
  if (!Array.isArray(obj.features)) throw new Error(`features must be an array`);
  for (const f of (obj.features as any[])) {
    assertMileMarkerFeature(f);
  }
}
