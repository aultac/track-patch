import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
import { context } from './state';

import { Map } from './Map';

const info = debug('indot/app#App:info');
const warn = debug('indot/app#App:warn');


export const App = observer(function App() {
  const { state, actions } = React.useContext(context);
  switch(state.page) {

    case 'get-domain': return (
      <div className="App">
        OADA Domain: 
        <input type="text" onChange={evt => { state.oada.domain = evt.target.value; }} value={state.oada.domain || 'https://localhost'} />
        <button onClick={() => { actions.authorize() }}>Go</button>
        <button onClick={() => { actions.deauthorize() }}>Clear token</button>
      </div>
    );

    case 'get-token': return (
      <div className="App">
        Logging in to {state.oada.domain} coming soon.
        For now, please supply a token here:
        <input type="text" onChange={evt => { state.oada.domain = evt.target.value; }} value={state.oada.token || ''} />
        <button onClick={() => { actions.authorize() }}>Login</button>
      </div>
    );

    case 'login': return (
      <div className="App">
        Login page not yet implemented.
      </div>
    );

    case 'map': return (
      <div className="App">
        { /* NavBar */ }
        <Map />
      </div>
    );
  }
});
