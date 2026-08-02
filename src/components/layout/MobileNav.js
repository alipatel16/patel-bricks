import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationItems } from './navigation';

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const items = navigationItems.filter((item) => item.mobile);
  const current = items.find((item) => item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path))?.path || '/';
  return (
    <Paper sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1200, display: { xs: 'block', md: 'none' }, borderRadius: 0, borderTop: '1px solid #E8E2D9' }} elevation={6}>
      <BottomNavigation value={current} onChange={(_, value) => navigate(value)} showLabels>
        {items.map(({ label, path, icon: Icon }) => (
          <BottomNavigationAction key={path} label={label} value={path} icon={<Icon fontSize="small" />} sx={{ minWidth: 0, '& .MuiBottomNavigationAction-label': { fontSize: '.66rem' } }} />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileNav;
