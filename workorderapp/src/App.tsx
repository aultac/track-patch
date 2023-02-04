import React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';
import log from './log';
  
import { Map } from './Map';
import { NavBar } from './NavBar';
  
import './App.css';

const { info, warn } = log.get('app');
  
export const App = observer(function App() {
  const { state } = React.useContext(context);
  switch(state.page) {
    case 'map': return (
      <div className="App">
        <NavBar />
        <Map />
      </div>
    );
  }
});

