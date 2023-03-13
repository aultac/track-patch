import { runInAction, action } from 'mobx';
import { parse, ParseStepResult } from 'papaparse';
import { state, ActivityMessage } from './state';
import log from '../log';
import type { Feature, FeatureCollection, GeoJSON, LineString } from 'geojson';
import { assertWorkOrder, DayTracks, vehicletracks, WorkOrder } from '@track-patch/lib';
import readtracks from './readtracks-worker.js'; // I couldn't get this to work as a worker
import xlsx from 'xlsx-js-style';
import numeral from 'numeral';

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
  const worksheet = xlsx.utils.json_to_sheet(_knownWorkorders);
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
    if (r['Total Hrs']) {
      //info('Proof-of-concept: values are generated at random');
      // match = reported / computed, therefore computed = reported / match
      const match = Math.random()*0.4 + 0.8; // 80% - 120%
      const computedHours = +(r['Total Hrs']) / match;
      r.match = numeral(match).format('0,0.00%');
      r.computedHours = numeral(computedHours).format('0,0.0');
    }
  }
  saveKnownWorkorders();
});
