import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Sidebar, { drawerWidth } from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

const AppShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box sx={{ minWidth: 0, width: { xs: '100%', lg: `calc(100% - ${drawerWidth}px)` }, ml: { lg: 0 } }}>
        <Header online={online} onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ p: { xs: 2, sm: 3, xl: 4 }, pb: { xs: 10, md: 4 }, maxWidth: 1680, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
      <MobileNav />
    </Box>
  );
};

export default AppShell;
