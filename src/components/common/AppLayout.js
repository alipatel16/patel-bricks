import React, { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

function AppLayout({ children, isConnected }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set initial sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        onToggle={handleSidebarToggle}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // Responsive margin based on sidebar state
          marginLeft: {
            xs: 0, // No margin on mobile (sidebar is overlay)
            sm: 0, // No margin on tablet (sidebar is overlay)
            md: sidebarOpen ? '240px' : '0', // Conditional margin on desktop
          },
          // Ensure content doesn't get cut off
          width: {
            xs: '100%',
            sm: '100%',
            md: sidebarOpen ? 'calc(100% - 240px)' : '100%',
          },
          overflow: 'hidden', // Prevent horizontal scroll
        }}
      >
        {/* Header */}
        <Header isConnected={isConnected} />

        {/* Page content */}
        <Box 
          sx={{ 
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 3 },
            overflow: 'auto',
            width: '100%',
            height: 'calc(100vh - 64px)', // Account for header height
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Backdrop for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.drawer - 1,
          }}
          onClick={handleSidebarToggle}
        />
      )}
    </Box>
  );
}

export default AppLayout;