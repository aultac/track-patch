import type {Point} from 'geojson';
import {assertRoad, Road} from '../index.js';
import type * as mainlib from '../index.js';
import log from '../log.js';

const { info } = log.get('test#gps2road');

export default async function roadnamesTest(lib: typeof mainlib) {
  info('test specific GPS points against roads');

  const points = [
    { point: { lon: -86.0665932714634, lat: 39.70572656326078, }, road: { number: 465, type: 'INTERSTATE', milemarkers: { min: { number: 50 }, max: { number: 51 } } } },
    { point: { lon: -86.04685489809373, lat: 39.73047969000132 }, road: { number: 465, type: 'INTERSTATE', ramp: true, milemarkers: { min: { number: 48 }, max: { number: 49 } } } },
    { point: { lon: -86.04690425844022, lat: 39.72576140602985 }, road: { number: 465, type: 'INTERSTATE', milemarkers: { min: { number: 49 }, max: { number: 50 } } } }, // this is closer to the road going under the highway, but should pick highway instead
    { point: { lon: -86.08257773993067, lat: 39.716750652826875 }, road: { type: 'LOCAL', name: 'S EMERSON AVE' } }, // local road, no milemarkers 
    { point: { lon: -86.09782357602025, lat: 39.57862810172227 }, road: { number: 31, type: 'INTERSTATE', milemarkers: { min: { number: 98 }, max: { number: 99 } } } },
    { point: { lon: -86.158959560169, lat: 39.58850791864327 },   road: { number: 135, type: 'STATE', milemarkers: { min: { number: 130 }, max: { number: 131 } } } },
  ];

  const paths = [
    { 
      before: [ { lon: -86.08916575349348, lat: 39.70387052522554 } ],
      point: { lon: -86.08254854150302, lat: 39.70367254182557 },
      after: [ { lon: -86.07846792744243, lat: 39.70361597503589 } ],
      road: { number: 465, type: 'INTERSTATE', milemarkers: { min: { number: 51 }, max: { number: 52 } } },
    }, // 465 through an interchange

    {
      before: [{ lon: -86.10164115755626, lat: 39.58987736924661 }, { lon: -86.10124778175663, lat: 39.588754598821566 }, { lon: -86.10072328069067, lat: 39.58719391770853 }, ],
      point: { lon: -86.10050166247775, lat: 39.58656593344941 },
      after: [ { lon: -86.09894411048691, lat: 39.58194315020316 }, { lon: -86.09810019294508, lat: 39.5794703113373 } ],
      road: { number: 31, type: 'INTERSTATE', milemarkers: { min: { number: 98 }, max: { number: 99 } } },
    } // US 31 south of indy through an interchange
  ];

  info('check all test points for correct identification');
  for (const [index, p] of points.entries()) {
    const result = await lib.gps2road({ point: p.point });
    if (!result) {
      info('FAIL: expected point = ', p);
      throw new Error('FAIL: result was null for point');
    }
    const errs = isSameRoad(result, p.road);
    if (errs.length > 0) {
      info('FAIL: expected point = ', p, ', result = ', result);
      throw new Error('ERROR: result is not the same road as expected.  Errors are: '+errs.join(', '));
    }
    info('PASSED test for point',index);
  }

  info('check all multi-point paths for correct identification');
  throw new Error('No tests written yet for paths.  Get demo working first.');
  for (const p of paths) {
  }

  info('passed all examples through roadNameToType');
}

function isSameRoad(result: any, expected: Record<string, any>): string[] {
  const errs = [];
  try {
   assertRoad(result)
  } catch(e: any) {
    errs.push('Result in isSameRoad is not a road, cannot compare to expected', e.toString());
    return errs;
  }
  if (result.number !== expected.number) errs.push(`result.number (${result.number}) !== expected.number(${expected.number})`);
  if (result.type !== expected.type) errs.push(`result.type (${result.type}) !== expected.type(${expected.type})`);
  if (typeof expected.milemarkers !== typeof result.milemarkers) errs.push(`typeof result.milemarkers (${typeof result.milemarkers}) !== typeof expected.milemarkers(${typeof expected.milemarkers})`);
  if (expected.milemarkers) {
    if (result.milemarkers?.min.number !== expected.milemarkers.min.number) errs.push(`result.milemarkers.min.number (${result.milemarkers?.min.number}) !== expected.milemarkers.min.number (${expected.milemarkers.min.number})`);
    if (result.milemarkers?.max.number !== expected.milemarkers.max.number) errs.push(`result.milemarkers.max.number (${result.milemarkers?.max.number}) !== expected.milemarkers.max.number (${expected.milemarkers.max.number})`);
  }
  return errs;
}
