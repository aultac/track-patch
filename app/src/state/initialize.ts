import { action } from 'mobx';
import { state } from './state';
import * as actions from './actions';
import debug from 'debug';
import { activity, oada } from './actions';
import { connect } from '@oada/client';
  
const info = debug("@indot-activity/app#initialize:info");
const warn = debug("@indot-activity/app#initialize:warn");


export const initialize = action('initialize', async () => {
  // Hard-code date for now:
  state.date = '2021-03-02';

  actions.authorize(); // if we already have domain/token, this will use them, otherwise it will prompt

});


