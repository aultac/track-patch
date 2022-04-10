import React from 'react';
import { observer } from 'mobx-react-lite';
import './App.css';
import debug from 'debug';
//import { Helmet, HelmetProvider } from 'react-helmet-async';
//import { context } from './state';

import { Map } from './Map';

const info = debug('indot/app#App:info');
const warn = debug('indot/app#App:warn');


export const App = observer(function App() {
  return (
      <div className="App">
        { /* NavBar */ }
        <Map />
      </div>
  );
});
