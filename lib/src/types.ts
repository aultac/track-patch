import type { Dayjs } from 'dayjs';
import type {Road} from '@track-patch/gps2road';
import debug from 'debug';
export * from '@track-patch/gps2road';

const info = debug('track-patch/gps2road#types');

export type Point = {
  time: Dayjs,
  lat: number,
  lon: number,
  speed: number, // this has been converted to mph
  heading: number,
  road?: Road,
  [key: string]: any
};

export type Track = Point[];

// A "VehicleDayTrack" represents possibly multiple single Tracks traveled by the same vehicle in one day.
export type VehicleDayTrack = {
  id: string,
  day: string, // YYYY-MM-DD
  track: Point[],
};

// This holds all the days/tracks for all the vehicles on a given day
export type VehicleDayTracks = {
  [vehicleid: string]: VehicleDayTrack,
};

// Top-level index of all the days that have tracks
export type DayTracks = {
  [day: string]: VehicleDayTracks,
};

// Workorders from spreadsheets:
export type WorkOrder = {
  "WO#": string,
  'Activity': string,
  'Subactivity': string,
  'Work Date': string,
  'Resource Type': string,
  'Resource Name': string,
  'Total Hrs'?: string,
  'Units Accomplished'?: string,
  'Inventory Asset': string,
  'Route (Ref)'?: string,
  'Start Post'?: string,
  'Start Offset'?: string,
  'End Post'?: string,
  'End Offset'?: string,
  'Asset Type': string,
  // This app will add these:
  computedHours?: string,
  match?: string,
  differenceHours?: string,
  // There are others, just keeping these for now
  [key: string]: any,
}
const WorkOrderRequiredKeys: (keyof WorkOrder)[] = [
  'WO#',
  'Activity',
  'Subactivity',
  'Work Date',
  'Resource Type',
  'Inventory Asset',
  'Asset Type',
];
const WorkOrderOptionalKeys: (keyof WorkOrder)[] = [
  // Things that are sometimes blank in sheet:
  'Units Accomplished',
  'Total Hrs',
  'Route (Ref)',
  'Start Post',
  'End Post',
  'Start Offset',
  'End Offset',
  // These are added by the app:
  'computedHours',
  'match',
  'differenceHours',
];
export function assertWorkOrder(o: any): asserts o is WorkOrder {
  if (!o || typeof o !== 'object') throw new Error('Must be an object and not falsey');
  for (const key of WorkOrderRequiredKeys) {
    if (typeof o[key] !== 'string') {
      info('lib/types: failed workorder =', o);
      throw new Error('Work order must have key '+key+' as a string, but it does not');
    }
  }
  for (const key of WorkOrderOptionalKeys) {
    if ((key in o) && typeof o[key] !== 'string') {
      info('lib/types: failed workorder =', o);
      throw new Error('Work order has a '+key+' key, but it is not a string');
    }
  }
}
