import React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';
import log from './log';
  
import { Map } from './Map';
import { NavBar } from './NavBar';
import { ConfigPane } from './ConfigPane';
import { ActivityLog } from './ActivityLog';
import { LowerLeftBox } from './LowerLeftBox';
  
import './App.css';

const { info, warn } = log.get('app');
  
export const App = observer(function () {
  const { state } = React.useContext(context);
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column',  padding: '10px', justifyContent: 'center', alignItems: 'center' }}>
      <NavBar/>
      
      <ActivityLog />

      <div style={{ display: 'flex', flexDirection: 'row', width: "100%" }}>
        <Map />
        <ConfigPane />
      </div>

    </div>
  );
});

