import { action } from 'mobx';
import log from '../log';
import { loadMilemarkers, loadRoads } from './actions';

import { setBaseUrl } from '@track-patch/gps2road';
  
const { info, warn } = log.get("initialize");

export const initialize = action('initialize', async () => {
  setBaseUrl(window.location.href.replace(/\?.*$/,'')); // localhost:5173/track-patch/


  // Loads some hard-coded roads
  // await loadRoads('dp7t9.json');
  // await loadMilemarkers();

});


