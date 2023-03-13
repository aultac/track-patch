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
import type { LineString } from 'geojson';

export { setBaseUrl } from './fetch.js';

const { info } = log.get('index');

export async function gps2road({point}: { point: Point }): Promise<Road | null> {
  const tiles = await fetchRoadTilesForPoint(point);
  if (!tiles || tiles.length < 1) return null; // no nearby roads found

  // 1. Compute distance to all road segments
  const roadswithdistances: { road: Road, dist: number }[] = [];
  for (const t of tiles) {
    const distances: number[] = [];
    for (const geojsonroad of t.features) {
      if (geojsonroad.geometry.type === 'MultiLineString') {
        for (const linecoordinates of geojsonroad.geometry.coordinates) {
          const linestring: LineString = { type: 'LineString', coordinates: linecoordinates };
          distances.push(pointToLineDistance([point.lon, point.lat], linestring, { units: 'feet' }));
        }
      } else if (geojsonroad.geometry.type === 'LineString') {
        distances.push(pointToLineDistance([point.lon, point.lat], geojsonroad.geometry, { units: 'feet' }));
      } else {
        throw new Error('Found a road ('+geojsonroad.properties.geofulladdress+') whose geometry is not a linestring.  It is instead a'+geojsonroad.geometry.type);
      }
      distances.sort((a,b) => a - b);
      roadswithdistances.push({ road: {
        ...guessRoadType(geojsonroad.properties),
        geojson: t, // Do we need to keep this?  Technically should be geojsonroad
      }, dist: distances[0]! });
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
    info('Failed to find any roads within max road width of',MAXROADWIDTH_FEET,'feet out of',roadswithdistances.length,'roads.  Closest road is',roadswithdistances[0]?.dist);
    info('point = ', point, ', Closest road = ', roadswithdistances[0]);
    info('geojson for all roads in this tile: ', JSON.stringify(roadswithdistances[0]?.road.geojson));
    return null;
  }
  info('Found road for point:',point,', now finding closest mile maerker');

  // 5. Given road segment, find closest mile marker.
  return pointAndRoad2Milemarker({ point, road: foundroad });
}
