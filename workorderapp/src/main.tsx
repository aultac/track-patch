import React from 'react'
import ReactDOM from 'react-dom/client'

import { version } from '../package.json'
import { context, initialContext } from './state';
import { App } from './App'

//@ts-ignore
import { Stream } from 'readable-stream';
// @ts-ignore
window.Stream = Stream;


import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <context.Provider value={initialContext}>
        <App />
      </context.Provider>
    </React.StrictMode>,
)
document.title = `Automatic Work Orders - v${version}`;
