export * as roadnames from './roadnames.js';
export * as geohash from './geohash.js';

import type { GeoJSON } from 'geojson';
import type { RoadTypeInfo } from './types.js';

export type MileMarker = {
  name: string,
  number: string,
  lat: number,
  lon: number,
};


export type RoadWithMileMarkers = RoadTypeInfo & {
  mileMarkers: {
    min: MileMarker,
    max: MileMarker,
  },
  geojson: GeoJSON,
};

export function gps2road(gps: { lat: number, lon: number }, nearbyRoads: GeoJSON[]) {

  // 0: OUTSIDE THIS FUNCTION: Use gps2PotentialRoadGeohashes to retrieve the nearby sets of roads
  // 
  // 2: Find close

}
