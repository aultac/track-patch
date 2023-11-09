import { runInAction, action } from 'mobx';
import { parse, ParseStepResult } from 'papaparse';
import { state, ActivityMessage, ParsingState } from './state';
import log from '../log';
import type { Feature, FeatureCollection, GeoJSON, LineString } from 'geojson';
import { DayTracks, vehicletracks } from '@track-patch/lib';
import { gps2road, Point, Road } from '@track-patch/gps2road';
import pLimit from 'p-limit';
import uniqolor from 'uniqolor';

const { info } = log.get('state/readtracks-worker');

export default async function(
  {file,parsingState,numRowsParsed}:
  {file: File, parsingState: (st: ParsingState) => void, numRowsParsed: (num: number) => void }
): Promise<{ 
  daytracks: DayTracks | null,
  daytracksGeoJSON: FeatureCollection | null
}> {
  let daytracks: DayTracks | null = null;
  let daytracksGeoJSON: FeatureCollection | null = null;

  parsingState('tracks');

  const { parseRow, complete } = vehicletracks.createRowParser( { 
    numRowsParsedReporter: numRowsParsed,
  });

  daytracks = await new Promise<DayTracks | null>((resolve, reject) => {
    parse(file, {
      step: (stepresult, parser) => {
        try {
          parseRow(stepresult.data as string[]);
        } catch (e: any) {
          info('ERROR: parseRow failed.  Error was:', e);
          parser.abort();
          reject(new Error('Failed to parse file.  Error from parser was: '+e.toString()));
          return;
        }
      },
      complete: () => {
        resolve(complete());
        // Now make the geojson version:
      },
    })
  });
  if (!daytracks) throw new Error('ERROR: daytracks is null after parsing');
  info('Parsing complete, days = ', daytracks);

  parsingState('roads');
  numRowsParsed(0);

  // Batch things in concurrent batches of 10000 each, and run 100 in parallel in each batch
  const limit = pLimit(1000);
  let pointsqueue: ReturnType<typeof limit>[] = [];
  let pointsmissingroads: Point[] = [];
  // Now find the roads/milemarkers for every point:
  let rownum = 0;
  for (const [day, vehicles] of Object.entries(daytracks)) {
    for (const [vid, vinfo] of Object.entries(vehicles)) {
      let prevroad: Road | null = null;
      for (const [index, point] of vinfo.track.entries()) {
        /*
        if (pointsqueue.length >= 10000) {
          info('Running batch...');
          await Promise.all(pointsqueue); // run the batch
          pointsqueue = [];
        }
        */
        pointsqueue.push(limit(async () => { 
          const road = await gps2road({ point, hintroad: prevroad });
          if (road) {
            point.road = road;
            prevroad = road;
          } else {
            pointsmissingroads.push(point);
          }
          if (!(++rownum % 1000)) numRowsParsed(rownum);
        }));
      }
    }
  }
  if (pointsqueue.length > 0) {
    await Promise.all(pointsqueue);
  }
  if (pointsmissingroads.length > 0) {
    info('points missing roads =', pointsmissingroads, ' and as geojson = ', JSON.stringify({
      type: 'FeatureCollection',
      features: pointsmissingroads.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ p.lon, p.lat ] } }))
    }));
  }

  // Everything that could figure out a road should now have a road

  parsingState('geojson');
  numRowsParsed(0);
  daytracksGeoJSON = daytracksToGeoJSON(daytracks, numRowsParsed);

  parsingState('done');
  return { daytracks, daytracksGeoJSON };
};

function daytracksToGeoJSON(daytracks: DayTracks, rownumReporter: (num: number) => void): FeatureCollection {
  const ret: FeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  }
  let rownum = 0;
  for (const [day, vehicles] of Object.entries(daytracks)) {
    for (const [vid, vdt] of Object.entries(vehicles)) {
      ret.features.push({
        type: 'Feature',
        properties: {
          vid,
          day,
          color: uniqolor(vid).color,
        },
        geometry: {
          type: 'LineString',
          coordinates: vdt.track.map(p => ([p.lon, p.lat])),
        }
      });
      rownum += vdt.track.length;
      rownumReporter(rownum);
    }
  }
  return ret;
}

