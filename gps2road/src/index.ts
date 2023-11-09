export * as roadnames from './roadnames.js';
export * as geohash from './geohash.js';
export * from './types.js';
import log from './log.js';
import { fetchRoadTilesForPoint } from './fetch.js';
import type { Point, Road } from './types.js';
import { pointToLineDistance } from '@turf/turf'
import { MAXROADWIDTH_FEET } from '@track-patch/constants';
import { guessRoadType } from './roadnames.js';
import { pointAndRoad2Milemarker } from './milemarkers.js';
import type { Geometry, LineString, MultiLineString } from 'geojson';

export { setBaseUrl, fetchMileMarkersForRoad } from './fetch.js';

const { info } = log.get('index');

function distanceToLineStringOrMultiLineString(point: Point, geom: Geometry): number {
  const distances: number[] = [];
  if (geom.type === 'MultiLineString') {
    for (const linecoordinates of geom.coordinates) {
      const linestring: LineString = { type: 'LineString', coordinates: linecoordinates };
      distances.push(pointToLineDistance([point.lon, point.lat], linestring, { units: 'feet' }));
    }
  } else if (geom.type === 'LineString') {
    distances.push(pointToLineDistance([point.lon, point.lat], geom, { units: 'feet' }));
  } else {
    throw new Error('Found a road whose geometry is not a linestring or a multilinstring.  It is instead a'+geom.type);
  }
  distances.sort((a,b) => a - b);
  return distances[0]!;
}

export async function gps2road({point, hintroad}: { point: Point, hintroad?: Road | null }): Promise<Road | null> {
  // If this point is within MAXROADWIDTH_FEET of hintroad, just use hintroad.  i.e. the previous road is likely
  // still the same road.
  if (hintroad && hintroad.geojson && hintroad.geojson.type === 'Feature') {
    const dist = distanceToLineStringOrMultiLineString(point, hintroad.geojson.geometry);
    if (dist <= MAXROADWIDTH_FEET) {
      return await pointAndRoad2Milemarker({ point, road: hintroad });
    }
  }
  
  const tiles = await fetchRoadTilesForPoint(point);
  if (!tiles || tiles.length < 1) return null; // no nearby roads found

  // 1. Compute distance to all road segments
  const roadswithdistances: { road: Road, dist: number }[] = [];
  for (const t of tiles) {
    for (const geojsonroad of t.features) {
      roadswithdistances.push({ 
        dist: distanceToLineStringOrMultiLineString(point, geojsonroad.geometry),
        road: {
          ...guessRoadType(geojsonroad.properties),
          geojson: geojsonroad, // Do we need to keep this?
        }, 
      });
    }
  }

  // 2. Sort shortest first
  roadswithdistances.sort((a,b) => a.dist - b.dist);

  // 3. Find shortest interstate, state, local
  const shortest_interstate = roadswithdistances.find(rwd => rwd.road.type === 'INTERSTATE');
  const shortest_state = roadswithdistances.find(rwd => rwd.road.type === 'STATE');
  const shortest_local = roadswithdistances.find(rwd => rwd.road.type === 'LOCAL');
  
  // 4. If shortest interstate is close enough, use it.  If not, check state.  If not, check local.
  let foundroad: Road | null = null;
  if (shortest_interstate && shortest_interstate.dist < MAXROADWIDTH_FEET) foundroad = shortest_interstate.road;
  else if (shortest_state && shortest_state.dist < MAXROADWIDTH_FEET) foundroad = shortest_state.road;
  else if (shortest_local && shortest_local.dist < MAXROADWIDTH_FEET) foundroad = shortest_local.road;
  if (!foundroad) {
    /*
    info('Failed to find any roads within max road width of',MAXROADWIDTH_FEET,'feet out of',roadswithdistances.length,'roads.  Closest road is',roadswithdistances[0]?.dist);
    info('point = ', point, ', Closest road = ', roadswithdistances[0]);
    info('geojson for closest road in this tile plus the point itself is: ', JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { }, geometry: { type: 'Point', coordinates: [ point.lon, point.lat ] } },
        roadswithdistances[0]?.road.geojson,
      ]
    }));
    */
    return null;
  }
  // info('shortest_interstate =',shortest_interstate,', shortest_state = ', shortest_state, ', shortest_local = ', shortest_local);

  // 5. Given road segment, find closest mile marker.
  const withmilemarkers = await pointAndRoad2Milemarker({ point, road: foundroad });
  // info('returning road with mile markers = ', withmilemarkers);
  return withmilemarkers;
}
