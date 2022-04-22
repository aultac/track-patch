import { action } from 'mobx';
import { state, ActivityMessage } from './state';
//import type { VehicleDayTracks, DayTracks, GeoJSONAllVehicles, GeoJSONVehicleFeature } from '../types';
import type { VehicleDayTracks, GeoJSONAllVehicles, GeoJSONVehicleFeature } from '../types';
import uniqolor from 'uniqolor';
import debug from 'debug';
import { connect } from '@oada/client';
//import { getAccessToken } from '@oada/id-client';

const warn = debug("accounts#actions:warn");
const info = debug("accounts#actions:info");

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

// You can make this jwk using oada-certs --create-keys, then copy pem here and lookup the kid from the jwk version
/*
const not_private_at_all_key = {
  "kty":"RSA" as const,
  "kid":"3b4b2f4f3faf41f6b50e3ae0d351496c",
  "e":"AQAB",
  "n":"7JQJwzi7ms6Z1R9Q_OI2cz2Qtokw907HANSv4-TNCNEKAvLy7B-Nl_uG12OOofJBGqa86P61g7i5uMjC1kRoJFw95X9jhJ2fg3Kmemr24jiECHoa0vUokm2l1fnqUJh9ScQGzWnPn9MnIMdR80MRMh4nbEm4m31PmCgvO7RTu6-ATYhO64RiF0lZpZIGsxrVvdDtGschFr53K1U1pXwY1FoctOwP-n5HmcgA3F8YaRiCOoiuYTaLA3BApbuQdRJLh4qP5ZnkNggBDVLY2932bIGLM0ANQi5bZbXoj5B5sqkcLvilariFDA1Vy-CGzKjmH_yXT1BCYIG67z9EOSZXYQ",
  "d":"DojWFrWQFROAehy3W9ey4NV59lmGrK5mQRYreacK2N-a4n-j4JqSzgx_mH6--oCI4LSmdKnLGqGJOTP7yYwONZmqCCBs8CWfOmnSKK8UpcCg-2kzVWa-AyhvPC6H-bDqXsEHRax1u2dX0EaDMcEtShAs6XBzeNTq1rmjAmNgSdxKFlCxgp3flOSunvVeVuXMC5hBBbkw_VQS-Gt0q732SyhL_CXCdgWz2MVe-uy9uYFKKwVWhIH6xrjVGFK613hjR2BDCivlTw-Zb_2w5j7ibnuJA53ZX5WNk1FaZO9783NpNB111Y83WvY3ol9jvYVBGqC2tNjWD3QDv2bWrmhiDw",
  "p":"_nali-dFFRtpcOeH_as8tvKdJM1oNyZmyLBQFHsVpYXByiEzlDF0RS4DqkwAapUNaXxJrHTbM3o-2NULhzF5UWC7rnqgOCzgRab_8oeS0aKXzS7oOibdmH2L_Rc-fMg__7so0jqQcOkdeiK1TJPJU9seGxerCaGVN_4qcbvoltc",
  "q":"7gG-iUY8-NFCMgmtuVHLblvTWYuk1buAqvTsWGjWYMd3RioCvBkIJY0Z8prVQLGmTh4r3yimZRoo8n-ORMpaIlhk60N34t0RTTi8tJ87pVp_m4c5aSvZ6edmmVY0AMoGWvy7daQWvp9NKDmPVUlBPyPHFGwHZ-CV1CPZkF86FIc",
  "dp":"n56hXc8m4ISfcblq7s65eTFbLbjDxMSL-RvQP-itvXTYCQkmp7EV9EdW-T5PjIwPK7pRJKLw1au7PJz3bEi2hzucv2gglNxhmo-VQfeVO3c4rfbcqY2zt3IZnBs2kWOz8aDfjHA8Jve0C-c1vuF9iuKKUghYu-PmDIec7FcpIWU",
  "dq":"vsNHJF_XntaaZ-C6DT8x_lI7JBp5E5YlmuCUTog4y3kUcHhbmMe3b-GYWosfQash0Jr-Lu817vL4vuTd8uT9OWn_-VEqVfs6UtqW5W57MB1JCi9oJJOxJXkDEwO0yq0iSusmlTPfxwmHniYEbCc61JCokAXGKcwoStAxITYyJyE",
  "qi":"diPIsInq9EzrGA3r6pPnqyEQClWnuLSS9A7q1NSsnCRqrcWXmx_GpHwBV8ztnBtW9nNTdGr9XD8FkuwFBr1Ty1_VmYgl6_RarprGSCSkA-DZTJZZalXCgIIeobxtrOIVgH8DcxFexY7HAHHNAN0py3Q8H4_eZ7btE3NsI1Era5Y"
};*/

export const deauthorize = action('deauthorize', () => {
  state.oada.token = '';
  localStorage.setItem('oada:token', '');
});
export const authorize = action('authorize', async () => {
  let domain = state.oada.domain || localStorage.getItem('oada:domain') || '';
  let token = state.oada.token || localStorage.getItem('oada:token') || '';

  if (!domain) {
    state.page = 'get-domain';
    info('No domain or no token, showing login screen');
    return;
  }

  if (!token) {
    state.page = 'get-token';
    info('Have a domain of ', domain, ', but no token so starting login process');
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
    oada(await connect({domain, token}));
    localStorage.setItem('domain', domain);
    localStorage.setItem('token', token);
  } catch(e: any) {
    activity('Failed to connect to oada');
    warn('Failed to connect to OADA, error was: ', e);
    alert('Failed to connec to OADA');
    return;
  }

  // Make sure everybody has the now-successful stuff for future reference:
  state.oada.domain = domain;
  state.oada.token = token;
  localStorage.setItem('token', token);
  localStorage.setItem('domain', domain);

});


//--------------------------------------------------------------------
// Working with static data.json file
//--------------------------------------------------------------------


/*
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
*/


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
    const path = `/bookmarks/indot-activity/locations/day-index/${state.date}`;
    const dt = await oada().get({ path }).then(r=>r.data) as any as VehicleDayTracks; // should probably assert this...
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


