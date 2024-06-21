import { action } from 'mobx';
import log from '../log';
import * as actions from './actions';

import { setBaseUrl } from '@track-patch/gps2road';
  
const { info, warn } = log.get("initialize");

export const initialize = action('initialize', async () => {
  setBaseUrl(window.location.href.replace(/\?.*$/,'')); // localhost:5173/track-patch/


  if (window.location.hostname === 'localhost') {
    // load processed tracks and work orders:
    info('Localhost as hostname, so loading processed tracks...');
    let response = await fetch('/ProcessedTracks.json');
    if (response.status >= 400) throw new Error(`Failed to fetch data from /ProcessedTracks.json`);
    const jsonstr = await response.text();
    info('Have processed tracks');

    info('Loading workorders as arraybuffer')
    response = await fetch('/WorkOrders.xlsx');
    if (response.status >= 400) throw new Error(`Failed to fetch data from /WorkOrders.xlsx`);
    const arraybuffer = await response.arrayBuffer();
    info('Loaded workorders as arraybuffer, loading them all into state');

    await actions.loadDayTracks({ jsonstr});
    await actions.loadKnownWorkorders({arraybuffer});
    await actions.validateWorkorders({ nosave: true });

    info('State loaded, choosing date and vehicle');
    actions.updateChosenDate("2020-12-21");
    actions.updateChosenVehicleID("64005");
  }
  // Loads some hard-coded roads
  // await loadRoads('dp7t9.json');
  // await loadMilemarkers();

});


