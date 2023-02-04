import * as React from 'react';
import { observer } from 'mobx-react-lite';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import log from './log';
import { context } from './state';

import "@fontsource/oleo-script"
const { info } = log.get('navbar');

// Mostly from the MaterialUI example page
export const NavBar = observer(() => {
  const { state, actions } = React.useContext(context);

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
            <Typography style={{ fontWeight: 'bold', fontFamily: '"Oleo Script", cursive' }} >AUTOMATIC<br/>WORKORDERS</Typography>
          </Box>

          <Box sx={{ width: '30px' }}>
          </Box>

          <Box>
            <Select label="GeoJSON Viz File" onChange={(evt) => actions.selectGeojsonVizFile(evt.target.value as string) } value={state.geojsonviz.selectedFile}>
              {state.geojsonviz.files.map((f,i) => 
                <MenuItem key={`vizfile${i}`} value={f}>{f}</MenuItem>
              )}
            </Select>
          </Box>

          <Box>
            <a style={{color: "white"}} href="#" onClick={() => { actions.loadRoads(state.geojsonviz.selectedFile) } }>Load Roads (rev {state.roads.rev})</a>
          </Box>

          <Box>
             <a style={{color: "white"}} href="#" onClick={() => { actions.loadMilemarkers() } }>Load MileMarkers (rev {state.milemarkers.rev})</a>
          </Box>

          <Box>
             <TextField onChange={(evt) => { actions.search(evt.target.value) } } value={state.search} />
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
});

