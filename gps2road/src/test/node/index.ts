import log from '../../log.js';

import * as mainlib from '../../node/index.js';
import roadnamesTest from '../roadnames.test.js';

const { info } = log.get('test#node');

info('testing example roadnames with roadnamesToType');
roadnamesTest(mainlib);
info('passed node account to file');


