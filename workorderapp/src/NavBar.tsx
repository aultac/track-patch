import * as React from 'react';
import { observer } from 'mobx-react-lite';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import log from './log';
import { context } from './state';

import "@fontsource/oleo-script"
const { info } = log.get('navbar');

// Mostly from the MaterialUI example page
export const NavBar = observer(() => {
  const { state, actions } = React.useContext(context);
  const [ anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => { setAnchorEl(event.currentTarget); }
  const handleClose = () => { setAnchorEl(null) };
  const menuClicked = (whichItem: typeof state.page) => () => {
    actions.page(whichItem);
    setAnchorEl(null);
  }

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box sx={{ display: 'flex', flexDirection: 'row' }} >
            <img 
              width="50px" 
              height="50px" 
              src="trackpatch-logo-white.svg" 
            />
            <Typography style={{ fontWeight: 'bold', fontFamily: '"Oleo Script", cursive' }} >AUTOMATIC<br/>WORKORDERS</Typography>
          </Box>

          <Box sx={{ width: '30px' }}>
          </Box>

          {/* Spacer to move menu to right */}
          <Box sx={{ flexGrow: 1 }}>
          </Box>

          { /*
          <Box>
            <IconButton size="large" onClick={handleMenu} color="inherit">
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={menuClicked('roadsmap')}>Roads Map Mode</MenuItem>
            </Menu>
          </Box>
          */ }
        </Toolbar>
      </Container>
    </AppBar>
  );
});

