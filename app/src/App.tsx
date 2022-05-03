import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
import { context } from './state';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { Map } from './Map';
import { NavBar } from './NavBar';

const info = debug('trackpatch/app#App:info');
const warn = debug('trackpatch/app#App:warn');

export const App = observer(function App() {
  const { state, actions } = React.useContext(context);
  switch(state.page) {

    case 'get-domain': return (
      <div className="App" style={{ display: 'flex', flexDirection: 'column', padding: 10, maxWidth: '400px' }}>
        <div style={{padding: 10}} >Please enter your OADA domain where tracks data can be found:</div>
        <TextField style={{ margin: 10}} id="domain" label="OADA Domain" onChange={evt => { actions.domain(evt.target.value); }} value={state.oada.domain || 'https://oats1.ecn.purdue.edu'} />
        <Button style={{ margin: 10 }} variant="contained" onClick={() => { 
          actions.domain((document.getElementById('domain') as HTMLInputElement).value); 
          actions.authorize(); 
        }}>Go</Button>
      </div>
    );

    case 'get-token': return (
      <div className="App" style={{ display: 'flex', flexDirection: 'column', padding: 10, maxWidth: '400px' }}>
        <div style={{padding: 10}} >Logging in to {state.oada.domain} coming soon.</div>
        <div style={{padding: 10}} >For now, please supply a token here:</div>
        <TextField style={{ margin: 10 }} id="token" label="Token" onChange={evt => { actions.token(evt.target.value); }} value={state.oada.token || ''} />
        <Button variant="contained" style={{ margin: 10 }} onClick={() => { 
          actions.token((document.getElementById('token') as HTMLInputElement).value); 
          actions.authorize() 
        }}>Connect</Button>
      </div>
    );

    case 'login': return (
      <div className="App">
        Login page not yet implemented.
      </div>
    );

    case 'map': return (
      <div className="App">
        <NavBar />
        <Map />
      </div>
    );
  }
});
