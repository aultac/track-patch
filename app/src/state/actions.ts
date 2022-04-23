import { action } from 'mobx';
import { state, ActivityMessage } from './state';
import type { VehicleDayTracks, DayTracks, GeoJSONAllVehicles, GeoJSONVehicleFeature } from '../types';
import uniqolor from 'uniqolor';
import debug from 'debug';
import { connect } from '@oada/client';
//import { getAccessToken } from '@oada/id-client';

const warn = debug("@indot/app#actions:warn");
const info = debug("@indot/app#actions:info");

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
  state.oada.token = '';
  localStorage.setItem('oada:token', '');
});
export const authorize = action('authorize', async () => {
  let _domain = state.oada.domain || localStorage.getItem('oada:domain') || '';
  let _token = state.oada.token || localStorage.getItem('oada:token') || '';
info('Using domain = ', _domain, ', token = ', _token);
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
    const redirect = window.location.origin + '/handleOAuthRedirect.html';
    const results = await getAccessToken(domain, { 
      metadata: { redirect_uris: [ redirect ] },
    });
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
      const response = await fetch('indot_activity/data.json');
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
    if (mph < bucketspeed) return index;
  }
  return state.speedbuckets.length; // past end of array if speed is above last speed
}



export const selectedDate = action('selectedDate', async (date: string): Promise<void> => {
  state.date = date;
  // Grab the tracks for this date
  activity(`Fetching location data for date ${state.date}`);
  try {
    //const dt = await loadDayFromDataFile(state.date);
    const path = `/bookmarks/indot-activity/locations/day-index/${state.date}`;
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
    
    const features: GeoJSONVehicleFeature[] = []; // one feature for each speedbucket for this vehicle
    for (let i=0; i <= state.speedbuckets.length; i++) { // note the "=" gets us the last bucket
      let maxspeed = (i === state.speedbuckets.length ? 100 : state.speedbuckets[i]!);
      let minspeed = (i === 0 ? 0 : state.speedbuckets[i-1]!);
      features[i] = {
        type: 'Feature',
        properties: { vehicleid, maxspeed, minspeed, color },
        geometry: {
          type: 'MultiLineString',
          coordinates: [ 
            [ ], // initially line is just empty
          ], // this will be an array of arrays of arrays (i.e. array of lines, and a line is an array of points, and a point is an array of 2 numbers)
        }
      };
    }

    // Now loop over all the tracks for that vehicle (keyed by starttime),
    // then use the speed buckets to break the big track into smaller tracks
    if (vehicledaytracks && vehicledaytracks.tracks) {
      for (const starttime of Object.keys(vehicledaytracks.tracks).sort()) {
        const track = vehicledaytracks.tracks[starttime]!;
        const times = Object.keys(track).sort(); // put sample times in order
        // initialize curbucket to the first point's speed bucket
        let curbucket = whichBucket(track[times[0]!]!.speed);

        const curMultiLineCoords = (): GeoJSON.Position[][] => features[curbucket]!.geometry.coordinates;
        // Handy function to get the last line segment for the current speed bucket's feature
        const curLineSegment = (): GeoJSON.Position[] => { // Position[] is how they represent a line
          const coords = curMultiLineCoords();
          return coords[coords.length-1]!;
        };

        // Now walk all the points in order
        for (const time of times) {
          const point = track[time]!;
          const geojson_point = [ point.lon, point.lat ];
          const bkt = whichBucket(point.speed);

          // If this point would switch us to a new bucket, end the previous line here
          let curline = curLineSegment();
          if (bkt !== curbucket) {
            curline.push(geojson_point);
            curbucket = bkt;
            // Create a new empty line for the next segment
            curMultiLineCoords().push([]); // start the new line where the old line left off
            // And now update the current line segment variable here
            curline = curLineSegment();
          }
          // Just add this point to the end of the current line segment (which could be the first point if the line is empty).
          // This duplicates the point at the end of the prior segment and at the start of the next so they are connected.
          curline.push(geojson_point); 
        }
      }
    }

    // And finally, add all the features for this vehicle (one multi-line for each speed bucket) to the main geojson feature collection
    const features_with_points = features.filter(f => f.geometry.coordinates[0]!.length > 0);
    allfeatures = [ ...allfeatures, ...features_with_points ];
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
export const geojson = action('geojson', (geojson?: GeoJSONAllVehicles): typeof _geojson | void => {
  if (typeof geojson === 'undefined') return _geojson;
  _geojson = geojson;
  state.geojson.rev++;
});


