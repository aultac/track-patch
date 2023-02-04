import log from '../../log.js';
import type * as mainlib from '../../browser/index.js';

import roadamesTest from '../roadnames.test.js';

const { info, error } = log.get('browser#test');

type WindowWithLibs = {
  libsundertest: typeof mainlib, // REPLACE ANY WITH LIBRARY TYPE
};

localStorage.debug = '*';

document.addEventListener('DOMContentLoaded', async() => {
  const libsundertest = (window as unknown as WindowWithLibs).libsundertest;

  const root = document.getElementById("root");
  if (!root) {
    error('ERROR: did not find root element!');
  } else {
    root.innerHTML = "The test is running!  Check the console."

    try { 
      info('Roadname tests');
      roadamesTest(libsundertest);

      info('Roadname tests successful');

    } catch(e: any) {
      info('FAILED: tests threw exception: ', e);
    }
  }


});
