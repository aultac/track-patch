import type { Point, Road } from './types';
import { distance, Point as TurfPoint } from '@turf/turf';
import {fetchMileMarkersForRoad} from './fetch';

// Returns a road with the milemarker key filled out,
// also mutates original road to include milemarker key
export async function pointAndRoad2Milemarker({point, road }: {point: Point, road: Road }): Promise<Road> {
  const thisroadmarkers = await fetchMileMarkersForRoad({ road });

  // Now find closest mile marker to this point
  const mindist = thisroadmarkers.reduce((min,marker,index) => {
    const dist = distance([point.lon, point.lat], [marker.lon, marker.lat], { units: 'feet' });
    if (dist < min.dist) return { dist, index, marker };
    return min;
  }, { dist: 10000000000, index: -1, marker: thisroadmarkers[0] } );

  // Now find the marker before and after the closest marker and decide which is closer
  const closest = mindist.marker!;
  
  // They are sorted in thisroadmarkers, so now get before/after by just index+1-1
  const before = mindist.index > 0 ? thisroadmarkers[mindist.index-1] : null;
  const after = mindist.index < thisroadmarkers.length - 1 ? thisroadmarkers[mindist.index+1] : null;

  let beforedist = 100000000;
  let afterdist = 100000000;
  if (before) beforedist = distance([point.lon, point.lat], [before.lon, before.lat], { units: 'feet' });
  if (after) afterdist = distance([point.lon, point.lat], [after.lon, after.lat], { units: 'feet' });

  if (beforedist < afterdist) {
    return {
      ...road,
      mileMarkers: {
        min: before!,
        max: closest,
      }
    };
  }
  return {
    ...road,
    mileMarkers: {
      min: closest,
      max: after!,
    },
  }
}
