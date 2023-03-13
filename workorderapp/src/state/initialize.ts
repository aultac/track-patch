import { action } from 'mobx';
import log from '../log';

import { setBaseUrl } from '@track-patch/gps2road';
  
const { info, warn } = log.get("initialize");

export const initialize = action('initialize', async () => {
  setBaseUrl(window.location.href); // localhost:5173/track-patch/
});


