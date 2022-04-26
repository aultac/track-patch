import React from 'react';
import { createRoot } from 'react-dom/client';
import pkg from '../package.json';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';
import { context, initialContext } from './state';
import { App } from './App';

document.title = `Track-Patch - v${pkg.version}`;
createRoot(document.getElementById('root')!).render(
  <context.Provider value={initialContext}>
    <App />
  </context.Provider>,
);

