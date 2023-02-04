import { exampleRoadnames } from './example-roadnames.js';

import type * as mainlib from '../index.js';
import log from '../log.js';

const { info } = log.get('test#roadnames');

export default function roadnamesTest(lib: typeof mainlib) {
  info('test all examples through roadNameToType');

  for (const [name, expected] of Object.entries(exampleRoadnames)) {
    const result = lib.roadnames.roadNameToType(name);
    if (result.type !== expected.type) {
      throw `FAIL: Example name (${name}) should have type ${expected.type}, but got ${result.type} instead`;
    }
    if (result.name !== expected.name) {
      throw `FAIL: Example name (${name} !== result.name (${result.name})`;
    }
    if (result.ramp !== expected.ramp) {
      throw `FAIL: Example name (${name}) should have ramp ${expected.ramp}, but got ${result.ramp} instead`;
    }
    if (result.number !== expected.number) {
      throw `FAIL: Example anme (${name}) should have number ${expected.number}, but got ${result.number} instead`;
    }
  }

  info('passed all examples through roadNameToType');
}
