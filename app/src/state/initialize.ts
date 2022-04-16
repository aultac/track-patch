import { action } from 'mobx';
import { state } from './state';
import * as actions from './actions';
import debug from 'debug';
import type { DayTracks } from '@indot-activity/lib';
import { activity } from './actions';
import type { GeoJSONVehicleFeature } from '../types';
import uniqolor from 'uniqolor';
import { connect } from '@oada/client';
  
const info = debug("@indot-activity/app#initialize:info");
const warn = debug("@indot-activity/app#initialize:warn");

// Segment lines by "speed buckets": 0-10, 10-20, 20-30, 30-40, 40+
function whichBucket(mph: number): number { // returns array index of which bucket this mph falls within
  for (const [index, bucketspeed] of state.speedbuckets.entries()) {
    if (mph < bucketspeed) return index;
  }
  return state.speedbuckets.length; // past end of array if speed is above last speed
}



export const initialize = action('initialize', async () => {
  // Hard-code date for now:
  state.date = '2021-04-21';

  const token = localStorage.getItem('token');
  const domain = localStorage.getItem('domain');
  //await actions.initializeOADA({ token, domain });

  // Load the days:
  activity(`Fetching location data for date ${state.date}`);
  try {
    const response = await fetch('indot_activity/data.json');
    if (response.status >= 400) throw new Error('Failed to fetch data');
    actions.days(await response.json() as unknown as DayTracks);
    activity(`Location data loaded, creating GeoJSON`);
  } catch(e: any) {
    warn('ERROR: failed to fetch data.  Error was: ', e);
    activity(`ERROR: Failed to fetch ./data.json, error was: ${e.toString()}`);
  }
  const days = actions.days();
  if (!days) {
    throw new Error('No vehicle data');
  }

  const day = days[state.date];
  if (!day) {
    throw new Error('WE HAVE NO VEHICLE DAY TRACK');
  }

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
  actions.geojson({
    type: 'FeatureCollection',
    features: allfeatures
  });
  info('GeoJSON loaded into the state');
});


