import { runInAction, action } from 'mobx';
import { state, ActivityMessage } from './state';
import log from '../log';
import type { FeatureCollection, GeoJSON } from 'geojson';
import { assertWorkOrder, DayTracks, Road, WorkOrder } from '@track-patch/lib';
import readtracks from './readtracks-worker.js'; // I couldn't get this to work as a worker
import xlsx from 'xlsx-js-style';
import numeral from 'numeral';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {guessRoadType, roadNameToType} from '@track-patch/gps2road/dist/roadnames';
import { fetchMileMarkersForRoad, MileMarker } from '@track-patch/gps2road';

dayjs.extend(customParseFormat);
const { info, warn } = log.get("actions");

//--------------------------------------------------------------------
// Working with static json files:
//--------------------------------------------------------------------

// Helper function to fetch a geojson asset:

const loadGeoJSON = action('loadGeoJSON', async (path: string): Promise<GeoJSON | null> => {
  try {
    const response = await fetch(`./${path}`);
    info('Fetch returned');
    if (response.status >= 400) throw new Error(`Failed to fetch data from ${path}`);
    info('Getting JSON from response');
    return await response.json();
  } catch(e: any) {
    warn('ERROR: failed to fetch roads data.  Error was: ', e);
    activity(`ERROR: Failed to fetch and load roads.geojson, error was: ${e.toString()}`);
  }
  return null;
});

let _roads: GeoJSON | null = null;
export function roads() { return _roads; }
export const loadRoads = action('loadRoads', async (filename: string) => {
  _roads = await loadGeoJSON(`roads-by-geohash/${filename}`);
  runInAction(() => { state.roads.rev++ });
});
let _milemarkers: GeoJSON | null = null;
export function milemarkers() { return _milemarkers; }
export const loadMilemarkers = action('loadMilemarkers', async () => {
  _milemarkers = await loadGeoJSON('milemarkers.geojson');
  runInAction(() => { state.milemarkers.rev++ });
});


//---------------------------------------------------
// GeoJSON visualizations
//---------------------------------------------------

export const selectGeojsonVizFile = action('selectGeojsonVizFile', async (filename: string) => {
  state.geojsonviz.selectedFile = filename;
  activity(`Loading roads from ${filename}`);
  await loadRoads(filename);
  activity('Done loading roads');
});

export const search = action('search', async (search: string) => {
  state.search = search;
});



//---------------------------------------------------
// Basic State updates
//---------------------------------------------------

export const page = action('page', (page: typeof state.page): void  => {
  state.page = page;
});

export const popActivity = action('popActivity', () => {
  if (state.activityLog.length < 1) return;
  state.activityLog = state.activityLog.slice(1);
});
export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
  if (!Array.isArray(msg)) {
    msg = [ msg ] as string[] | ActivityMessage[];
  }
  // Make sure evey element is an activity message (convert strings):
  let msgs: ActivityMessage[] = msg.map((m: any) => {
    if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
      return m as ActivityMessage;
    } else {
      return { msg: m, type} as ActivityMessage;
    }
  });
  info(msgs.map(m=>m.msg).join('\n'));
  state.activityLog = [...state.activityLog, ...msgs ];
  setTimeout(popActivity, 5000);
});


//-------------------------------------------------------------------
// Basic View interaction
//-------------------------------------------------------------------

export const hover = action('hover', (hover: typeof state['hover']): void => {
  state.hover = hover;
});

//----------------------------------------------------------------
// Parsing the big tracks file
//----------------------------------------------------------------

export const parsingInProgress = action('parsingInProgress', (val: typeof state['parsing']['inprogress']): void => {
  state.parsing.inprogress = val;
});
export const parsingEstimatedRows = action('parsingEstimatedRows', (val: typeof state['parsing']['estimatedRows']): void => {
  state.parsing.estimatedRows = val;
});
export const parsingCurrentNumRows = action('parsingCurrentNumRows', (val: typeof state['parsing']['currentNumRows']): void => {
  state.parsing.currentNumRows = val;
});
export const parsingState = action('parsingState', (val: string) => {
  state.parsing.state = val;
});
let _daytracks: DayTracks | null = null;
export function daytracks() { return _daytracks; }
let _daytracksGeojson: FeatureCollection | null = null;
export function daytracksGeoJSON() { return _daytracksGeojson; }
// This populates both _daytracks and _daytracksGeojson
export const loadDayTracks = action('loadDayTracks', async (file: File) => {
  parsingInProgress(true);
  parsingEstimatedRows(file.size / 240); // seems to be around 240 bytes/record

  const result = await readtracks({
    file,
    numRowsParsed: parsingCurrentNumRows,
    parsingState,
  });
  _daytracks = result.daytracks;
  _daytracksGeojson = result.daytracksGeoJSON;

  parsingEstimatedRows(state.parsing.currentNumRows); // make sure progress bar is finished
  activity('Parsing complete!');
  parsingInProgress(false);
  info('Parsing complete, days = ', _daytracks);
  runInAction(() => { state.daytracks.rev++ });
  runInAction(() => { state.daytracksGeoJSON.rev++ });
});



let _knownWorkorders: WorkOrder[] | null = null;
export function knownWorkorders() { return _knownWorkorders };
export function numKnownWorkorders() { return _knownWorkorders ? _knownWorkorders.length : 0 }
export const loadKnownWorkorders = action('loadKnownWorkorders', async (file: File) => {
  const wb = xlsx.read(await file.arrayBuffer());
  const records = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });
  _knownWorkorders = records.filter((r,index) => {
    try { 
      assertWorkOrder(r);
    } catch(e: any) {
      info('WARNING: line',index+1,'in work orders sheet was not a valid work order:', e.message);
      return false;
    }
    return true;
  }) as WorkOrder[];
  runInAction(() => { state.knownWorkorders.orders.rev++ });
});
export const saveKnownWorkorders = action('saveKnownWorkorders', async () => {
  if (!_knownWorkorders) throw new Error('Failed to save: there are no known work orders');
  const worksheet = xlsx.utils.json_to_sheet(_knownWorkorders.filter(w => w.computedHours && w.computedHours > 0));
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Validated Records (PoC)");
  xlsx.writeFile(workbook, 'validated-workorder.xlsx'); // downloads file
});
export const knownWorkOrdersParsing = action('knownWorkOrdersParsing', async (val: boolean) => {
  state.knownWorkorders.parsing = val;
});
export const validateWorkorders = action('validateWorkorders', async () => {
  if (!_knownWorkorders) throw new Error('No work orders to validate');
  for (const r of _knownWorkorders) {
    if (!r['Total Hrs']) {
      info('No Total Hrs');
      continue; // no reported hours means we skip this one
    }
    const reported_hours = +(r['Total Hrs']);
    if (isNaN(reported_hours)) {
      info('Reported hours isNaN');
      continue;
    }

    if (r['Resource Type'] !== 'Equipment') {
      info('Resource Type',r['Resource Type'],'is not Equipment');
      continue; // this is the only thing we can identify right now
    }

    const vid = +(r['Resource Name'].split('-')[0]?.trim().replace(/^0+/,'')); // no leading zeros
    if (isNaN(vid)) {
      info('Unable to find vehicle id',vid,'in Resource Type',r['Resource Type']);
      continue; // we don't recognize this equipment number
    }

    const workorderday = dayjs(r['Work Date'],'M/D/YY');
    if (!workorderday.isValid()) {
      info('Work Date',r['Work Date'],'invalid');
      continue; // invalid dates don't work either
    }
    const day = workorderday.format('YYYY-MM-DD');

    if (!r['Route (Ref)']) {
      info('No Route (Ref)')
      continue; // need a route ref to know what road it is
    }
    let road = roadNameToType(r['Route (Ref)']);
    info('Identified road', road, 'from Route (Ref)',r['Route (Ref)']);

    // Grab the mile marker for start post and end post for this road,
    // Road may or may not have mile markers
    let startpost: MileMarker | null = null;
    let endpost: MileMarker | null = null;
    if (r['Start Post'] && r['End Post'] && r['Start Offset'] && r['End Offset']) {
      const milemarkers = await fetchMileMarkersForRoad({ road });
      if (!milemarkers || milemarkers.length < 1) {
        info('Found no mile markers for road');
        continue; // can't asses time without knowing the mile markers
      }
      startpost = milemarkers.find(m => m.number === +(r['Start Post']!)) || null;
      endpost = milemarkers.find(m => m.number === +(r['End Post']!)) || null;
      if (!startpost) {
        info('Found no startpost');
        continue; // we don't have a post for this, but the workorder specified one, so skip this one too
      }
      if (!endpost) {
        info('Found no endpost');
        continue;  // we don't have a post for this, but the workorder specified one, so skip this one too
      }
      // ensure consistent ordering (startpost is less than endpost)
      if (startpost.number > endpost.number) {
        const tmp = startpost;
        endpost = startpost;
        startpost = tmp;
      }
    }

    const dt = daytracks()?.[day]?.[vid];
    if (dt) {
      let computedSeconds = 0;
      // A vehicle is considerd to be on a part of a road from the current point until the next point unless the next point is more than 5 mins away.
      for (const [index, point] of dt.track.entries()) {
        if (!point.road) continue; // cannot contribute working time if this point was not on a known road.

        // Is this point on the road section of interest?
        if (point.road.type !== road.type) continue;
        if (point.road.number !== road.number) continue;
        if (startpost && endpost) {
          if (!point.road.milemarkers) continue;
          if (startpost.number > point.road.milemarkers.max.number) continue;
          if (endpost.number < point.road.milemarkers.min.number) continue;
        }
        
        // If we actually ever get here, then things match and we can compute time
        if (index >= dt.track.length - 1) {
          computedSeconds += 5 * 60; // last point counts for 5 mins no matter what
          continue;
        }
        const next = dt.track[index+1]!;
        let duration = next.time.unix() - point.time.unix();
        if (duration > 5 * 60) duration = 5 * 60;
        computedSeconds += duration;
      }
      const computedHours = computedSeconds / 3600;
      const match = computedHours ? reported_hours / computedHours : 0;
      r.match = numeral(match).format('0,0.00%');
      r.computedHours = numeral(computedHours).format('0,0.00');
      r.differenceHours = numeral(reported_hours - computedHours).format('0,0.00');
      info('WE ACTUALLY HAVE A COMPUTED HOURS!!!',computedHours);

    } else {
      info('No track fonud for day',day,'and vehicleid',vid);
    }

  }
  saveKnownWorkorders();
});
