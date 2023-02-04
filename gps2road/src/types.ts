import type { Feature, FeatureCollection } from 'geojson';

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
