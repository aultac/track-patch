import React from 'react';
import './App.css';
import debug from 'debug';
import type { DayTracks }  from '@indot-activity/lib';
import type GeoJSON from 'geojson';
import ReactMapGl, { Source, Layer } from 'react-map-gl';

const info = debug('indot/app#App:info');
const warn = debug('indot/app#App:warn');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXVsdGFjIiwiYSI6ImNsMXA4MzU3NTAzbzUzZW55ajhiM2FsOGwifQ.8Umhtpm98ty92vbos4kM3Q';


// STOPPED HERE:
// - I have a map.  Next need to draw geojson on it.
// - XXXX 0: load the existing JSON thing into memory.
// - 1: Generate geojson of all the tracks on a given day, colored by vehicle id with fill-extrusion, fill-extrusion-height, and fill-extrusion-base heights based on speed
// - 2: Remember you can do line styling with the weird callback syntax they have
// - 3: hard-code a day, see those tracks!
// - 4: get a day picker on top to change day

const date = '2021-04-21';
let data: DayTracks | null = null;
const alltracks: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [], // each vehicle will have one feature in this list for each speed bucket (all the line segments of that speed)
};

const buckets = [ 10, 20, 30, 40 ];
// Create the geojson of all the tracks on this day with a vehicleid in the properties. 
// In order to color by the vehicleid and then extrude by the speed.
// I assume we'll have to get the lines themselves into at least SOME segmented parts, so
// we'll segment them by "speed buckets": 0-10, 10-20, 20-30, 30-40, 40+
function whichBucket(mph: number): number { // returns array index of which bucket this mph falls within
  for (const [index, bucketspeed] of buckets.entries()) {
    if (mph < bucketspeed) return index;
  }
  return buckets.length; // past end of array if speed is above last speed
}

type GeoFeatureProps = {
  vehicleid: string,
  maxspeed: number,
  minspeed: number,
  color: string,
};
type VehicleFeature = GeoJSON.Feature<GeoJSON.MultiLineString, GeoFeatureProps>;


async function loadData(setAllTracks: (t: GeoJSON.FeatureCollection) => void) {
  if (alltracks.features.length > 0) {
    setAllTracks(alltracks);  // already loaded
  }

  data = (await fetch('./data.json').then(res => res.json()) as unknown as DayTracks);
  console.log('data = ', data);

  const day = data[date];
  if (!day) {
    throw new Error('WE HAVE NO VEHICLE DAY TRACK');
  }

  for (const [vehicleid, vehicledaytracks] of Object.entries(day)) {
    info('Creating geojson features for vehicleid ', vehicleid);
    // Each speed bucket will be a MultiLineString "feature" (since it will be colored/extruded the same).
    // A MultiLineString is just an array of lines, so each line will represet a continuous segment of same-vehicle-same-speedbucket
    
    const features: VehicleFeature[] = []; // one feature for each speedbucket for this vehicle
    for (let i=0; i <= buckets.length; i++) { // note the "=" gets us the last bucket
      let maxspeed = (i === buckets.length ? 100 : buckets[i]!);
      let minspeed = (i === 0 ? 0 : buckets[i-1]!);
      features[i] = {
        type: 'Feature',
        properties: { vehicleid, maxspeed, minspeed, color: "#FF0000" },
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
          curMultiLineCoords().push([]); // empty array to add points to
          // And now update the current line segment variable here
          curline = curLineSegment();
        }
        
        // Just add this point to the end of the current line segment (which could be the first point if the line is empty).
        // This duplicates the point at the end of the prior segment and at the start of the next so they are connected.
        curline.push(geojson_point); 
      }
    }

    // And finally, add all the features for this vehicle (one multi-line for each speed bucket) to the main geojson feature collection
    alltracks.features = [ ...alltracks.features, ...(features.filter(f => f.geometry.coordinates[0]!.length > 0)) ];
  }

  info('Done creating geojson features for all vehicles!! Displaying...');
  setAllTracks(alltracks);
}

const test = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            -86.429443359375,
            40.22921818870117
          ],
          [
            -86.84692382812499,
            39.977120098439634
          ],
          [
            -86.868896484375,
            39.631076770083666
          ],
          [
            -86.4404296875,
            39.35978526869001
          ],
          [
            -85.704345703125,
            39.317300373271024
          ],
          [
            -85.53955078125,
            39.65645604812829
          ],
          [
            -85.682373046875,
            40.153686857794035
          ],
          [
            -86.385498046875,
            40.23760536584024
          ]
        ]
      }
    }
  ]
};


function App() {
  const [alltracksState, setAllTracks] = React.useState<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });

  React.useEffect(() => { loadData(setAllTracks); }, []); // runs once, does not await the promise
info('RENDER IS RUNNING NOW, alltracksState = ', alltracksState);
  if (!alltracksState) return <div className="App">No data available</div>;
  return (
    <div className="App">

      <ReactMapGl
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -86.8,
          latitude: 39.5,
          zoom: 4.5
        }}
        style={{width: 600, height: 400}}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
      >
        <Source type="geojson" data={alltracksState}>
          <Layer id="data" type="line" paint={{ 'line-width': 10, 'line-color': '#FF0000' }} />
        </Source>

      </ReactMapGl>

    </div>
  );
}

export default App;
