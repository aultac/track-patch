import React from 'react';
import ReactDOM from 'react-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';
import { context, initialContext } from './state';
import { App } from './App';

ReactDOM.render(
  <context.Provider value={initialContext}>
    <App />
  </context.Provider>,
  document.getElementById('root')
);


