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

const { info } = log.get('index');

export async function gps2road({point}: { point: Point }): Promise<Road | null> {
  const tiles = await fetchRoadTilesForPoint(point);
  if (!tiles || tiles.length < 1) return null; // no nearby roads found

  // 1. Compute distance to all road segments
  const roadswithdistances: { road: Road, dist: number }[] = [];
  for (const t of tiles) {
    for (const geojsonroad of t.features) {
      if (geojsonroad.geometry.type !== 'LineString') {
        throw new Error('Found a road whose geometry is not a linestring');
      }
      const dist = pointToLineDistance([point.lon, point.lat], geojsonroad.geometry, { units: 'feet' });
      roadswithdistances.push({ road: {
        ...guessRoadType(geojsonroad.properties),
        //geojson: geojsonroad, // Do we need to keep this?
      }, dist });
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
    info('Failed to find any roads within max road width of',MAXROADWIDTH_FEET,'feet');
    return null;
  }

  // 5. Given road segment, find closest mile marker.
  return pointAndRoad2Milemarker({ point, road: foundroad });
}
