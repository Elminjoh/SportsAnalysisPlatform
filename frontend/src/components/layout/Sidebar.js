import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar,
} from '@mui/material';
import {
  Dashboard, DirectionsRun, AddCircle, BarChart,
  Person, EmojiEvents, Balance, People, Assessment, SportsScore
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const athleteMenuItems = [
  { text: 'Dashboard',      icon: <Dashboard />,     path: '/dashboard' },
  { text: 'Performances',   icon: <DirectionsRun />, path: '/performances' },
  { text: 'Add Performance',icon: <AddCircle />,     path: '/performances/add' },
  { text: 'Analytics',      icon: <BarChart />,      path: '/analytics' },
  { text: 'Benchmarking',   icon: <EmojiEvents />,   path: '/benchmarking' },
  { text: 'RAE Analysis',   icon: <Balance />,       path: '/rae' },
  { text: 'Profile',        icon: <Person />,        path: '/profile' },
];

const coachMenuItems = [
  { text: 'Coach Dashboard', icon: <Dashboard />,  path: '/coach' },
  { text: 'My Roster',       icon: <People />,     path: '/coach?view=roster' },
  { text: 'New Assessment',  icon: <Assessment />, path: '/coach?view=assess' },
  { text: 'Profile',         icon: <Person />,     path: '/profile' },
];

const Sidebar = ({ open, onClose }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const menuItems = user?.role === 'coach' ? coachMenuItems : athleteMenuItems;

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 600) onClose();
  };

  const drawer = (
    <>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path && item.path !== '/coach' || 
                        location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth, flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="temporary"
        open={open} onClose={onClose}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Sidebar;