import log from '../../log.js';
import type * as mainlib from '../../browser/index.js';

import roadamesTest from '../roadnames.test.js';
import gps2roadTest from '../gps2road.test.js';
import anugunjTest from '../anugunj.test.js';

const { info, error } = log.get('browser#test');

type WindowWithLibs = {
  libsundertest: typeof mainlib, // REPLACE ANY WITH LIBRARY TYPE
};

localStorage.debug = '*';

document.addEventListener('DOMContentLoaded', async() => {
  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  if (window.location.hostname === 'localhost') {
    libsundertest.setBaseUrl(window.location.protocol + '//' + window.location.host);
  }

  const root = document.getElementById("root");
  if (!root) {
    error('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!  Check the console."

    try { 
      console.log('STARTNG TESTS: should see info statements after this.');
      info('Roadname tests');
      roadamesTest(libsundertest);

      info('gps2road tests');
      await gps2roadTest(libsundertest);

      info('anugunj tests');
      await anugunjTest(libsundertest);

      info('All tests successful');
    } catch(e: any) {
      info('FAILED: tests threw exception: ', e);
      throw e;
    }
  }


});
