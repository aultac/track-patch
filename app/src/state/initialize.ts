import { action } from 'mobx';
import { state } from './state';
import * as actions from './actions';
import debug from 'debug';
//import { activity, oada } from './actions';
import { activity } from './actions';
//import { connect } from '@oada/client';
  
const info = debug("@indot-activity/app#initialize:info");
const warn = debug("@indot-activity/app#initialize:warn");


export const initialize = action('initialize', async () => {
  // Hard-code date for now:
  state.date = '2021-04-21';
/*
  actions.authorize(); // if we already have domain/token, this will use them, otherwise it will prompt
  const token = state.oada.token!;
  const domain = state.oada.domain!;
  try {
    oada(await connect({domain,token})); // use this connection for all actions
  } catch(e: any) {
    warn('WARNING: could not connect to OADA.  Error was: ', e);
    alert('Failed to connect to OADA.');
    activity('Failed to connect to OADA: ', e.toString());
  }
*/
  await actions.selectedDate('2021-04-21');

});


