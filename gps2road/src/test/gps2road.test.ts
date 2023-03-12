import type * as mainlib from '../index.js';
import log from '../log.js';

const { info } = log.get('test#gps2road');

export default async function roadnamesTest(lib: typeof mainlib) {
  info('test specific GPS points against roads');

  const points = [
    { point: { lon: -86.0665932714634, lat: 39.70572656326078, }, road: { number: 465, type: 'INTERSTATE', milemarkers: { min: 50, max: 51 } } },
    { point: { lon: -86.04685489809373, lat: 39.73047969000132 }, road: { number: 465, type: 'INTERSTATE', ramp: true, milemarkers: { min: 48, max: 49 } } },
    { point: { lon: -86.04690425844022, lat: 39.72576140602985 }, road: { number: 465, type: 'INTERSTATE', milemarkers: { min: 49, max: 50 } } }, // this is closer to the road going under the highway, but should pick highway instead
    { point: { lon: -86.08257773993067, lat: 39.716750652826875 }, road: { type: 'LOCAL', name: 'S EMERSON AVE' } }, // local road, no milemarkers 
    { point: { lon: -86.09782357602025, lat: 39.57862810172227 }, road: { number: '31', type: 'INTERSTATE', milemarkers: { min: 98, max: 99 } } },
    { point: { lon: -86.158959560169, lat: 39.58850791864327 },   road: { number: '135', type: 'STATE', milemarkers: { min: 130, max: 131 } } },
  ];

  const paths = [
    { 
      before: [ { lon: -86.08916575349348, lat: 39.70387052522554 } ],
      point: { lon: -86.08254854150302, lat: 39.70367254182557 },
      after: [ { lon: -86.07846792744243, lat: 39.70361597503589 } ],
      road: { number: 465, type: 'INTERSTATE', milemarkers: { min: 51, max: 52 } },
    }, // 465 through an interchange

    {
      before: [{ lon: -86.10164115755626, lat: 39.58987736924661 }, { lon: -86.10124778175663, lat: 39.588754598821566 }, { lon: -86.10072328069067, lat: 39.58719391770853 }, ],
      point: { lon: -86.10050166247775, lat: 39.58656593344941 },
      after: [ { lon: -86.09894411048691, lat: 39.58194315020316 }, { lon: -86.09810019294508, lat: 39.5794703113373 } ],
      road: { number: 31, type: 'INTERSTATE', milemarkers: { min: 98, max: 99 } },
    } // US 31 south of indy through an interchange
  ];

  info('check all test points for correct identification');
  for (const p of points) {
    const result = await lib.gps2road({ point: p.point });
    if (!result) {
      info('FAIL: expected point = ', p);
      throw new Error('FAIL: result was null for point');
    }
    const errs = isSameRoad(result, p.road);
    if (errs.length > 0) {
      info('FAIL: expected point = ', p);
      throw new Error('ERROR: result is not the same road as expected.  Errors are: '+errs.join(', '));
    }
  }

  info('check all multi-point paths for correct identification');
  throw new Error('No tests written yet for paths.  Get demo working first.');
  for (const p of paths) {
  }

  info('passed all examples through roadNameToType');
}

function isSameRoad(result: Record<string,any>, expected: Record<string,any>): string[] {
  const errs = [];
  for (const [key, val] of Object.entries(expected)) {
    if (val !== result[key]) errs.push(`Key ${key} of expected (${expected[key]} is different than result ${result[key]}`);
  }
  return errs;
}
