import { action } from 'mobx';
import dayjs, { Dayjs } from 'dayjs';
import { state, ActivityMessage } from './state';
import type { VehicleDayTracks, DayTracks, GeoJSONAllVehicles, GeoJSONLineProps, GeoJSONVehicleFeature } from '../types';
import uniqolor from 'uniqolor';
import debug from 'debug';
import { connect } from '@oada/client';
import { minspeed, maxspeed } from '../util';
import { getAccessToken } from '@oada/id-client/dist/browser';

const warn = debug("@trackpatch/app#actions:warn");
const info = debug("@trackpatch/app#actions:info");

//--------------------------------------------------------------------
// OADA functions (authorize, connection)
//--------------------------------------------------------------------

// Handy function to ensure we have an oada to make TS happy:
type OADAType = Awaited<ReturnType<typeof connect>>;
let _oada: OADAType | null = null;
export function oada(newoada?: OADAType): OADAType {
  if (newoada) _oada = newoada; // initialize this by passing an oada client to this function
  if (!_oada) throw new Error('oada connection was never initialized');
  return _oada;
}


export const deauthorize = action('deauthorize', () => {
  localStorage.setItem('oada:token', '');
  localStorage.setItem('oada:domain', '');
  state.oada.token = '';
  state.oada.domain = '';
  state.page = 'get-domain';
});
export const authorize = action('authorize', async () => {
  let _domain = state.oada.domain || localStorage.getItem('oada:domain') || '';
  let _token = state.oada.token || localStorage.getItem('oada:token') || '';
  if (!_domain) {
    state.page = 'get-domain';
    info('No domain or no token, showing login screen');
    return;
  }

  if (!_token) {
    state.page = 'get-token';
    info('Have a domain of ', _domain, ', but no token so starting login process');
    return;
    /*
    const redirect = window.location.origin + '/track-patch/handleOAuthRedirect.html';
    const results = await getAccessToken(_domain, { 
      metadata: { redirect_uris: [ redirect ] },
    });
    info('results of getAccessToekn are: ', results);
    */
  }

  // Otherwise, we can go ahead and connect
  try {
    oada(await connect({domain: _domain, token: _token}));
  } catch(e: any) {
    activity('Failed to connect to oada');
    warn('Failed to connect to OADA, error was: ', e);
    alert('Failed to connec to OADA');
    return;
  }

  // Make sure everybody has the now-successful stuff for future reference:
  domain(_domain);
  token(_token);

  // If we have a date already, go ahead and load it, and show activity:
  state.page = 'map';
  if (state.date) {
    activity('Loading selected date...');
    selectedDate(state.date);
  }
});
export const domain = action('domain', (domain?: string): void | string | null => {
  if (!domain) return state.oada.domain;
  state.oada.domain = domain;
  localStorage.setItem('oada:domain', domain);
});
export const token = action('token', (token?: string): void | string | null => {
  if (!token) return state.oada.token;
  state.oada.token = token;
  localStorage.setItem('oada:token', token);
});


//--------------------------------------------------------------------
// Working with static data.json file
//--------------------------------------------------------------------


// Leave this for quick debugging later if we want to load directly from data.json:
let _daysFromDataJson: DayTracks | null = null;
async function loadDayFromDataFile(date: string) {
  if (!_daysFromDataJson) {
    try {
      const response = await fetch('track-patch/data.json');
      if (response.status >= 400) throw new Error('Failed to fetch data');
      _daysFromDataJson = await response.json() as unknown as DayTracks;
    } catch(e: any) {
      warn('ERROR: failed to fetch data.  Error was: ', e);
      activity(`ERROR: Failed to fetch and load data.json, error was: ${e.toString()}`);
      return;
    }
  }
  return _daysFromDataJson[date];
}


//--------------------------------------------------------------------
// Loading tracks based on date:
//--------------------------------------------------------------------


// Segment lines by "speed buckets": 0-10, 10-20, 20-30, 30-40, 40+
function whichBucket(mph: number): number { // returns array index of which bucket this mph falls within
  for (const [index, bucketspeed] of state.speedbuckets.entries()) {
    if (mph < bucketspeed) {
      return index;
    }
  }
  return state.speedbuckets.length; // past end of array if speed is above last speed
}



export const selectedDate = action('selectedDate', async (date: string): Promise<void> => {
  // Show the loading page with the activity
  geojson(null);


  state.date = date;

  // Set the simulation end time as the end of this day
  simulate({ running: false, endtime: dayjs(`${date}T23:59:59`) });

  // Grab the tracks for this date
  activity('----------------------------------------------------------');
  activity(`Fetching location data for date ${state.date}`);
  try {
    //const dt = await loadDayFromDataFile(state.date);
    const path = `/bookmarks/track-patch/locations/day-index/${state.date}`;
    let { data } = await oada().get({ path });
    // remove any oada keys from data:
    for (const k of Object.keys(data as any)) {
      if (k.match(/^_/)) delete (data as any)[k];
    }
    const dt = data as any as VehicleDayTracks; // should probably assert this...
    daytracks(dt);
    activity(`Location data loaded, creating GeoJSON tracks for the map`);
  } catch(e: any) {
    warn('ERROR: failed to fetch data.  Error was: ', e);
    activity(`ERROR: Failed to fetch data for ${state.date}, error was: ${e.toString()}`);
  }

  const day = daytracks()!;
  let allfeatures: GeoJSONVehicleFeature[] = [];
  for (const [vehicleid, vehicledaytracks] of Object.entries(day)) {
    info(`Creating track for vehicle ${vehicleid}`);

    // Compute a color for this vehicleid:
    const { color } = uniqolor(vehicleid);

    // Each speed bucket will be a MultiLineString "feature" (since it will be colored/extruded the same).
    // A MultiLineString is just an array of lines, so each line will represet a continuous segment of same-vehicle-same-speedbucket
   
    // Now loop over all the tracks for that vehicle (keyed by starttime),
    // then use the speed buckets to break the big track into smaller tracks
    if (vehicledaytracks && vehicledaytracks.tracks) {
      for (const starttime of Object.keys(vehicledaytracks.tracks).sort()) {
        const track = vehicledaytracks.tracks[starttime]!;
        const times = Object.keys(track).sort(); // put sample times in order
        // Now walk all the points in order
        for (const [index, time] of times.entries()) {
          if (!index) continue; // skip first point, we are making lines so we need 2 points
          const point = track[time]!;
          const prev = track[times[index-1]!]!;
          const coordinates: number[][] = [ 
            [prev.lon, prev.lat],
            [point.lon, point.lat],
          ];
          const speedbucket = whichBucket(point.speed);
          allfeatures.push({
            type: 'Feature',
            properties: { 
              vehicleid, 
              maxspeed: maxspeed(speedbucket, state.speedbuckets),
              minspeed: minspeed(speedbucket, state.speedbuckets),
              speedbucket,
              mph: point.speed,
              time: dayjs(point.time),
              color 
            }, // color is from above
            geometry: {
              type: 'LineString',
              coordinates,
            }
          });
        }
      }
    }
  }
  activity(`Created ${allfeatures.length} tracks for ${Object.keys(day).length} vehicles, placing into state`);
  geojson({ // action down below
    type: 'FeatureCollection',
    features: allfeatures
  });
  info('GeoJSON loaded into the state');
})



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

// These things are too big to store in the mobx state, it locks the browser.
// So we keep them here in memory, and just store a "rev" in the state for the
// components to listen to.
let _daytracks: VehicleDayTracks | null = null;
export const daytracks = action('daytracks', (daytracks?: typeof _daytracks): typeof _daytracks | void => {
  if (typeof daytracks === 'undefined') return _daytracks;
  _daytracks = daytracks;
  state.daytracks.rev++;
});

let _geojson: GeoJSONAllVehicles | null = null;
export const geojson = action('geojson', (geojson?: GeoJSONAllVehicles | null): typeof _geojson | void => {
  if (typeof geojson === 'undefined') return _geojson;
  _geojson = geojson;
  info('geojson is now: ', geojson);
  state.geojson.rev++;
});


//-------------------------------------------------------------------
// Basic View interaction
//-------------------------------------------------------------------

export const filterbucket = action('filterbucket', (filterbucket: string | number): void => {
  if (typeof filterbucket === 'string') {
    if (filterbucket === 'all') state.filterbucket = -1;
    state.filterbucket = +(filterbucket);
    return;
  }
  state.filterbucket = filterbucket;
});

export const hover = action('hover', (hover: typeof state['hover']): void => {
  state.hover = hover;
});

export const simulate = action('simulate', (sim: { endtime?: Dayjs, running?: boolean, simspeed?: number }): void => {
  if (state.simulate.running) stopSim();
  state.simulate = { ...state.simulate, ...sim };
});
export const toggleSimulate = action('toggleSimulate', (): void => {
  if (state.simulate.running) return stopSim();
  playSim();
});
let simtimer: ReturnType<typeof setInterval> | null = null;
export const simEndtime = action('simEndtime', (
  {beginning, end, hour, minute, second, time }: 
  { beginning?: boolean, end?: boolean, hour?: number, minute?: number, second?: number, time?: Dayjs }
): void => {
  let endtime = state.simulate.endtime;
  if (typeof beginning !== 'undefined') { endtime = dayjs(`${state.date}T00:00:00`); }
  if (typeof end !== 'undefined') { endtime = dayjs(`${state.date}T23:59:59`); }
  if (typeof hour !== 'undefined') { endtime = state.simulate.endtime.add(hour, 'hours'); }
  if (typeof minute !== 'undefined') { endtime = state.simulate.endtime.add(minute, 'minutes'); }
  if (typeof second !== 'undefined') { endtime = state.simulate.endtime.add(second, 'seconds'); }
  if (typeof time !== 'undefined') { endtime = time; }
  // If we over-shot...
  if (endtime.format('YYYY-MM-DD') !== state.date) {
    endtime = dayjs(`${state.date}T00:00:00`);
  }
  state.simulate.endtime = endtime;
  return;
});
export const playSim = action('playSim', (): void => {
  if (state.simulate.running) return; // already runnning
  state.simulate.running = true;
  const refreshms = 250;
  simtimer = setInterval(() => {
    if (state.simulate.endtime.format('HH:mm:ss') === "23:59:59") {
      simEndtime({ beginning: true });
    }
    simEndtime({ second: state.simulate.simspeed * (refreshms/1000) });
  }, refreshms);
});
export const stopSim = action('stopSim', (): void => {
  if (!state.simulate.running) return; // already stopped
  state.simulate.running = false;
  if (simtimer) clearInterval(simtimer);
});
