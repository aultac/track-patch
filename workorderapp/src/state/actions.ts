import { runInAction, action } from 'mobx';
import { state, ActivityMessage } from './state';
import log from '../log';
import type { GeoJSON } from 'geojson';

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
  _roads = await loadGeoJSON(`split_by_dataset/${filename}`);
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
});


//-------------------------------------------------------------------
// Basic View interaction
//-------------------------------------------------------------------

export const hover = action('hover', (hover: typeof state['hover']): void => {
  state.hover = hover;
});


