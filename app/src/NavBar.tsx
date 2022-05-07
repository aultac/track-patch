import * as React from 'react';
import { observer } from 'mobx-react-lite';
import AppBar from '@mui/material/AppBar';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import PlayArrow from '@mui/icons-material/PlayArrowRounded';
import Pause from '@mui/icons-material/PauseRounded';
import Right from '@mui/icons-material/ChevronRightRounded';
import Left from '@mui/icons-material/ChevronLeftRounded';
import RightEnd from '@mui/icons-material/LastPageRounded';
import LeftEnd from '@mui/icons-material/FirstPageRounded';
import debug from 'debug';
import { context } from './state';

import "@fontsource/oleo-script"
const info = debug('accounts#NavBar:info');

const pages = ['Activity', 'Ledger', 'Balance Sheet', 'Profit Loss' ];
const settings = ['Config'];

// Mostly from the MaterialUI example page
export const NavBar = observer(() => {
  const { actions, state } = React.useContext(context);

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box sx={{ display: 'flex', flexDirection: 'row' }} >
            <img 
              width="50px" 
              height="50px" 
              src="/track-patch/trackpatch-logo-white.svg" 
            />
            <Typography style={{ fontWeight: 'bold', fontFamily: '"Oleo Script", cursive' }} >TRACK<br/>PATCH</Typography>
          </Box>

          <Box sx={{ width: '30px' }}>
          </Box>

          <Box>
            <input type="date" 
              value={state.date || ''} 
              onChange={evt => actions.selectedDate(evt.target.value)}
            />
          </Box>

          <Box>
            <Select
              value={ state.filterbucket >= 0 ? state.filterbucket : 'all' }
              label="Filter Speed"
              onChange={ evt => { actions.filterbucket(evt.target.value) } }
              style={{color: 'white'}}
            >
              <MenuItem value={'all'}>All Speeds</MenuItem>
              { state.speedbuckets.map((b,index) => 
                <MenuItem value={index} key={`speedbucketchoice${index}`}>
                  { index === 0 ? `< ${b} mph` : `${state.speedbuckets[index-1]!}-${b} mph` }
                </MenuItem>)
              }
              <MenuItem value={state.speedbuckets.length}>
                &gt; {state.speedbuckets[state.speedbuckets.length-1]} mph
              </MenuItem>
            </Select>
          </Box>

          <Box style={{ marginLeft: '5px', display: 'flex', flexDirection: 'row' }}>
            <div>
              Time:
            </div>
            <LeftEnd style={{ color: "#FFFFFF" }} onClick={ () => actions.simEndtime({ beginning: true })} />
            <Left style={{ color: "#FFFFFF" }} onClick={ () => actions.simEndtime({ hour: -1 }) }/>
            <div style={{ color: "#FFFFFF" }}>
              {state.simulate.endtime.format('HH:mm:ss')}
            </div>
            <Right style={{ color: "#FFFFFF" }} onClick={ () => actions.simEndtime({ hour: 1 }) }/>
            <RightEnd style={{ color: "#FFFFFF" }} onClick={ () => actions.simEndtime({ end: true }) } />
            { state.simulate.running 
              ? <Pause style={{ color:"#FFFFFF" }} onClick={() => actions.stopSim() }/>
              : <PlayArrow style={{ color:"#FFFFFF"}} onClick={() => actions.playSim() } />
            }
          </Box>

          <Box style={{flexGrow: 1}}></Box>

          <Box>
            { state.oada.token ? <a style={{color: "white"}} href="#" onClick={() => actions.deauthorize()}>Logout</a> : '' }
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
});

