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
        <button onClick={() => { /*actions.initializeOADA()*/ info('not implemented') }}>Login</button>
      </div>
    );

    case 'login': return (
      <div className="App">
        Logging in to {state.oada.domain}...
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
