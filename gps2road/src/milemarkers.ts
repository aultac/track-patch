import type { Point, Road } from './types';
import { distance, Point as TurfPoint } from '@turf/turf';
import {fetchMileMarkersForRoad} from './fetch';
import log from './log.js';

const { info } = log.get('milemarker');

// Returns a road with the milemarker key filled out,
// also mutates original road to include milemarker key
export async function pointAndRoad2Milemarker({point, road }: {point: Point, road: Road }): Promise<Road> {
  const thisroadmarkers = await fetchMileMarkersForRoad({ road });

  if (thisroadmarkers.length < 1) {
    return road; // no mile markers found
  }

  // Now find closest mile marker to this point
  const mindist = thisroadmarkers.reduce((min,marker,index) => {
    const dist = distance([point.lon, point.lat], [marker.lon, marker.lat], { units: 'feet' });
    if (dist < min.dist) return { dist, index, marker };
    return min;
  }, { dist: 10000000000, index: -1, marker: thisroadmarkers[0] } );

  // Now find the marker before and after the closest marker and decide which is closer
  const closest = mindist.marker!;
  const closestdist = mindist.dist;

  // They are sorted in thisroadmarkers, so now get before/after by just index+1-1
  const before = mindist.index > 0 ? thisroadmarkers[mindist.index-1] : null;
  const after = mindist.index < thisroadmarkers.length - 1 ? thisroadmarkers[mindist.index+1] : null;

  let beforedist = 100000000;
  let afterdist = 100000000;
  if (before) beforedist = distance([point.lon, point.lat], [before.lon, before.lat], { units: 'feet' });
  if (after) afterdist = distance([point.lon, point.lat], [after.lon, after.lat], { units: 'feet' });

  // If the point is closer to the post numbered before the closest post, then it's between before and closest (closest is max)
  if (beforedist < afterdist) {
    return {
      ...road,
      milemarkers: {
        min: {
          post: before!,
          offset: beforedist / 5280.0, // in miles
        },
        max: {
          post: closest,
          offset: -closestdist / 5280.0, // negative b/c it is "before" the max numbered post
        },
      }
    };
  }
  // Otherwise, the point is closer to the point after the closest post than the one before the closest post (closest is min)
  return {
    ...road,
    milemarkers: {
      min: {
        post: closest,
        offset: closestdist / 5280.0,
      },
      max: {
        post: after!,
        offset: -afterdist / 5280.0, // negative b/c it is "before" the max-numbered post
      },
    },
  }
}
