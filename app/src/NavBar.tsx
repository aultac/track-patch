import * as React from 'react';
import { observer } from 'mobx-react-lite';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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

        </Toolbar>
      </Container>
    </AppBar>
  );
});

