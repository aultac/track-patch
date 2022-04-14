import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
import { context } from './state';

import { Map } from './Map';

const info = debug('indot/app#App:info');
const warn = debug('indot/app#App:warn');


export const App = observer(function App() {
  const { state } = React.useContext(context);
  switch(state.page) {
    case 'login': return (
      <div className="App">
        Login...
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
