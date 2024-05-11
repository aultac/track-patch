import xlsx from 'xlsx-js-style';
import { WorkOrder, VehicleDayTrackSeg } from '@track-patch/lib';
import {roadNameToType} from '@track-patch/gps2road/dist/roadnames';
import { fetchMileMarkersForRoad, MileMarker } from '@track-patch/gps2road';
import { daytracks } from './actions';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import log from '../log';
const { info } = log.get("workorder_helpers");

// Core function to compute how long a vehicle was on a road segment:
export type RoadSegment = {
  'Inventory Asset'?: string,
  'Start Post'?: string,
  'End Post'?: string,
  'Start Offset'?: string,
  'End Offset'?: string,
  'Route (Ref)'?: string,
};
export function assertRoadSegment(o: any): asserts o is RoadSegment {
  if (!o || typeof o !== 'object') throw `assertRoadSegment: must be an object`;
  if ('Inventory Asset' in o && typeof o['Inventory Asset'] !== 'string') throw `assertRoadSegment: Inventory Asset must be a string if it exists`;
  if ('Start Post' in o && typeof o['Start Post'] !== 'string') throw `assertRoadSegment: Start Post must be a string if it exists`;
  if ('End Post' in o && typeof o['End Post'] !== 'string') throw `assertRoadSegment: End Post must be a string if it exists`;
  if ('Start Offset' in o && typeof o['Start Offset'] !== 'string') throw `assertRoadSegment: Start Offset must be a string if it exists`;
  if ('End Offset' in o && typeof o['End Offset'] !== 'string') throw `assertRoadSegment: End Offset must be a string if it exists`;
  if ('Route (Ref)' in o && typeof o['Inventory Asset'] !== 'string') throw `assertRoadSegment: Inventory Asset must be a string if it exists`;
}

export async function computeSecondsOnRoadSegmentForVehicleOnDay({ seg, vehicleid, day }: { seg: RoadSegment, vehicleid: number, day: string /* YYYY-MM-DD */} ): Promise<number> {
  if (!seg['Route (Ref)']) {
    info('No Route (Ref)')
    return 0; // need a route ref to know what road it is
  }
  let road = roadNameToType(seg['Route (Ref)']);

  // Grab the mile marker for start post and end post for this road,
  // Road may or may not have mile markers
  let startpost: MileMarker | null = null;
  let startoffset = 0;
  let endpost: MileMarker | null = null;
  let endoffset = 0;
  if (seg['Start Post'] && seg['End Post'] && seg['Start Offset'] && seg['End Offset']) {
    const milemarkers = await fetchMileMarkersForRoad({ road });
    if (!milemarkers || milemarkers.length < 1) {
      info('Found no mile markers for road');
      return 0; // can't asses time without knowing the mile markers
    }
    startpost = milemarkers.find(m => m.number === +(seg['Start Post']!)) || null;
    endpost = milemarkers.find(m => m.number === +(seg['End Post']!)) || null;
    if (!startpost) {
      info('Found no startpost');
      return 0; // we don't have a post for this, but the workorder specified one, so skip this one too
    }
    if (!endpost) {
      info('Found no endpost');
      return 0;  // we don't have a post for this, but the workorder specified one, so skip this one too
    }
    startoffset = +(seg['Start Offset']) || 0;
    endoffset = +(seg['End Offset']) || 0;
    // ensure consistent ordering (startpost is less than endpost)
    if (startpost.number > endpost.number) {
      const tmp = endpost;
      endpost = startpost;
      startpost = tmp;
      const tmpoffset = endoffset;
      endoffset = startoffset;
      startoffset = tmpoffset;
    }

    // Our points from tracks all have a consistent pattern of min/max posts, and the "offsets" for the point itself are always positive
    // from the min and negative from the max.  i.e. [ min_post----positive_min_offset--->point<----negative_max_offset----max_post ]
    // Let's keep the same pattern here for sanity: if the startpost offset is negative (i.e. before the startpost), decrement startpost and (1+offset)
    // If the endoffset is positive, increment endpost and (offset - 1)
    const origstartpost = startpost;
    if (startoffset < 0) {
      const prev = startpost.number - 1;
      startpost = milemarkers.find(m => m.number === prev) || null;
      startoffset = 1 + startoffset;
    }
    const origendpost = endpost;
    if (endoffset > 0) {
      const next = endpost.number + 1;
      endpost = milemarkers.find(m => m.number === next) || null;
      endoffset = endoffset - 1;
    }
    // TODO: There are actually missing mile markers in the dataset of mile markers.  Should probably make synthetic ones to ensure
    // they all actually incremenet by one
    if (!startpost) {
      info('Start Offset was negative (',startoffset-1,') (so we need to move startpost to previous post to be consistent), for post', origstartpost,'but could not find prior post in set of milemarkers: ', milemarkers.map(m => m.number).join(','), 'for road', road, '.  Resetting offset to 0 on mile marker.');
      startpost = origstartpost;
      startoffset = 0;
    }
    if (!endpost) {
      info('End Offset was positive (',endoffset+1,') (so we need to move endpost to next post to be consistent), for post', origendpost,'but could not find next post in set of milemarkers: ', milemarkers.map(m => m.number).join(','), 'for road', road, '.  Resetting offset to 0 on mile marker.');
      endpost = origendpost;
      endoffset = 0;
    }
  }

  const dt = daytracks()?.[day]?.[vehicleid];
  if (!dt) return 0;
  let computedSeconds = 0;
  // A vehicle is considerd to be on a part of a road from the current point until the next point unless the next point is more than 5 mins away.

  for (const [index, point] of dt.track.entries()) {
    if (!point.road) continue; // cannot contribute working time if this point was not on a known road.

    // Is this point on the road section of interest?
    if (point.road.type !== road.type) continue;
    if (point.road.number !== road.number) continue;
    if (startpost && endpost) {
      if (!point.road.milemarkers) continue;
      const pointmax = point.road.milemarkers.max;
      const pointmin = point.road.milemarkers.min;
      // If the startpost number is after the point's max, it's not on this segment
      if (startpost.number > pointmax.post.number) continue;
      // If the endpost number is before the point's min, it's not on this segment
      if (endpost.number < pointmin.post.number) continue;
      // If the startpost is same as point's min, and startpost's offset is before point's min's offset, then it's not on this segment
      if (startpost.number === pointmin.post.number && startoffset < pointmin.offset) continue;
      // If the endpost is same as point's max, and endpost's offset is after point's max's offset, then it's not on this segment
      if (endpost.number === pointmax.post.number && endoffset > pointmax.offset) continue;
      // Otherwise, the point itself and its offsets must be between this segment's start/end posts and offsets
    }

    // If we actually ever get here, then things match and we can compute time
    if (index >= dt.track.length - 1) {
      computedSeconds += 5 * 60; // last point counts for 5 mins no matter what
      continue;
    }
    // TODO: should actually compute (using speed, or estimated speed from lat/lon/time of next point)
    // when the vehicle would cross the start or end offset boundary, rather than attribute all the time
    // to the road segment of the point itself
    const next = dt.track[index+1]!;
    let duration = next.time.unix() - point.time.unix();
    if (duration > 5 * 60) duration = 5 * 60;
    computedSeconds += duration;
  }
  return computedSeconds;
}


export function vehicleidFromResourceName(name: string): number {
  const vid = +(name?.split('-')[0]?.trim().replace(/^0+/,'')); // no leading zeros
  if (isNaN(vid)) return 0;
  return vid;
}

export async function saveWorkorders(filename: string, workorders: WorkOrder[]) {
  if (!workorders || workorders.length < 1) throw new Error('Failed to save: there are no known work orders');
  const worksheet = xlsx.utils.json_to_sheet(workorders);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Validated Records (PoC)");
  xlsx.writeFile(workbook, filename); // downloads file
}

// Helper/Hack function to just get all the road segments that are listed in any work orders as a big list:
export function PrintAllKnownRoadSegmentsFromWorkOrdersInADiv(knownWorkorders: WorkOrder[]) {
  // Grab all the unique road segments out of work orders
  info('Grabbing all known route segments');
  const segs: { [assetid: string]: { 
    'Inventory Asset': string,
    'Route (Ref)': string,
    'Start Post': string,
    'Start Offset': string,
    'End Post': string,
    'End Offset': string,
  } } = {};
  for (const wo of knownWorkorders) {
    if (wo['Route (Ref)'] && wo['Start Post'] && wo['Start Offset'] && wo['End Post'] && wo['End Offset']) {
      const routestr = `${wo['Route (Ref)']!}-${wo['Start Post']!}-${wo['Start Offset']!}-${wo['End Post']!}-${wo['End Offset']!}`;
      segs[routestr] = {
        'Inventory Asset': wo['Inventory Asset'],
        'Route (Ref)': wo['Route (Ref)']!,
        'Start Post': wo['Start Post']!,
        'Start Offset': wo['Start Offset']!,
        'End Post': wo['End Post']!,
        'End Offset': wo['End Offset']!,
      };
    }
  }
  info('unique road segments = ', segs);
  const div = document.createElement('div');
  div.innerHTML = JSON.stringify(segs, null, '  ');
  document.body.appendChild(div);
}

export async function computePointsOnRoadSegmentForVehicleOnDay({ seg, vehicleid, day }: { seg: RoadSegment, vehicleid: number, day: string /* YYYY-MM-DD */} ){
  let retData : VehicleDayTrackSeg | null = null;
  
  if (!seg['Route (Ref)']) {
    info('No Route (Ref)')
    return retData; // need a route ref to know what road it is
  }
  let road = roadNameToType(seg['Route (Ref)']);

  // Grab the mile marker for start post and end post for this road,
  // Road may or may not have mile markers
  let startpost: MileMarker | null = null;
  let startoffset = 0;
  let endpost: MileMarker | null = null;
  let endoffset = 0;
  if (seg['Start Post'] && seg['End Post'] && seg['Start Offset'] && seg['End Offset']) {
    const milemarkers = await fetchMileMarkersForRoad({ road });
    if (!milemarkers || milemarkers.length < 1) {
      info('Found no mile markers for road');
      return retData;; // can't asses time without knowing the mile markers
    }
    startpost = milemarkers.find(m => m.number === +(seg['Start Post']!)) || null;
    endpost = milemarkers.find(m => m.number === +(seg['End Post']!)) || null;
    if (!startpost) {
      info('Found no startpost');
      return retData;; // we don't have a post for this, but the workorder specified one, so skip this one too
    }
    if (!endpost) {
      info('Found no endpost');
      return retData;;  // we don't have a post for this, but the workorder specified one, so skip this one too
    }
    startoffset = +(seg['Start Offset']) || 0;
    endoffset = +(seg['End Offset']) || 0;
    // ensure consistent ordering (startpost is less than endpost)
    if (startpost.number > endpost.number) {
      const tmp = endpost;
      endpost = startpost;
      startpost = tmp;
      const tmpoffset = endoffset;
      endoffset = startoffset;
      startoffset = tmpoffset;
    }

    // Our points from tracks all have a consistent pattern of min/max posts, and the "offsets" for the point itself are always positive
    // from the min and negative from the max.  i.e. [ min_post----positive_min_offset--->point<----negative_max_offset----max_post ]
    // Let's keep the same pattern here for sanity: if the startpost offset is negative (i.e. before the startpost), decrement startpost and (1+offset)
    // If the endoffset is positive, increment endpost and (offset - 1)
    const origstartpost = startpost;
    if (startoffset < 0) {
      const prev = startpost.number - 1;
      startpost = milemarkers.find(m => m.number === prev) || null;
      startoffset = 1 + startoffset;
    }
    const origendpost = endpost;
    if (endoffset > 0) {
      const next = endpost.number + 1;
      endpost = milemarkers.find(m => m.number === next) || null;
      endoffset = endoffset - 1;
    }
    // TODO: There are actually missing mile markers in the dataset of mile markers.  Should probably make synthetic ones to ensure
    // they all actually incremenet by one
    if (!startpost) {
      info('Start Offset was negative (',startoffset-1,') (so we need to move startpost to previous post to be consistent), for post', origstartpost,'but could not find prior post in set of milemarkers: ', milemarkers.map(m => m.number).join(','), 'for road', road, '.  Resetting offset to 0 on mile marker.');
      startpost = origstartpost;
      startoffset = 0;
    }
    if (!endpost) {
      info('End Offset was positive (',endoffset+1,') (so we need to move endpost to next post to be consistent), for post', origendpost,'but could not find next post in set of milemarkers: ', milemarkers.map(m => m.number).join(','), 'for road', road, '.  Resetting offset to 0 on mile marker.');
      endpost = origendpost;
      endoffset = 0;
    }
  }

  const dt = daytracks()?.[day]?.[vehicleid];
  if (!dt) return retData;;
  let computedPoints = [];
  let startTime: number = 0;
  let endTime: number = 0;
  // A vehicle is considerd to be on a part of a road from the current point until the next point unless the next point is more than 5 mins away.

  for (const [index, point] of dt.track.entries()) {
    if (!point.road) continue; // cannot contribute working time if this point was not on a known road.
    
    // Is this point on the road section of interest?
    if (point.road.type !== road.type) continue;
    if (point.road.number !== road.number) continue;
    if (startpost && endpost) {
      if (!point.road.milemarkers) continue;
      const pointmax = point.road.milemarkers.max;
      const pointmin = point.road.milemarkers.min;
      // If the startpost number is after the point's max, it's not on this segment
      if (startpost.number > pointmax.post.number) continue;
      // If the endpost number is before the point's min, it's not on this segment
      if (endpost.number < pointmin.post.number) continue;
      // If the startpost is same as point's min, and startpost's offset is before point's min's offset, then it's not on this segment
      if (startpost.number === pointmin.post.number && startoffset < pointmin.offset) continue;
      // If the endpost is same as point's max, and endpost's offset is after point's max's offset, then it's not on this segment
      if (endpost.number === pointmax.post.number && endoffset > pointmax.offset) continue;
      // Otherwise, the point itself and its offsets must be between this segment's start/end posts and offsets
    }
    computedPoints.push([point.lat, point.lon])
    if (index === 0){
      startTime = point.time.unix();
    }
    if(index === dt.track.length - 1){
      endTime = point.time.unix()
    }
  }
  retData = {
    day: day,
    vid: vehicleid,
    seg: seg['Route (Ref)'],
    track: computedPoints
  }
  return retData;
}
