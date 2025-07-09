import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Alert, Snackbar } from '@mui/material';
import { Toaster } from 'react-hot-toast';

// Import services
import { initializeDatabase, checkConnection } from './services/firebase';

// Import context providers
import { AuthProvider, useAuth } from './context/AuthContext'; // ADD THIS LINE
import { AppProvider } from './context/AppContext';
import { InventoryProvider } from './context/InventoryContext';

// Import layout components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';

// Import pages
import Dashboard from './pages/Dashboard';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import CustomerManagement from './components/customers/CustomerManagement';

// ADD THIS IMPORT
import LoginPage from './components/auth/LoginPage';

// Import constants
import { APP_NAME } from './utils/constants';

// Import styles
import './App.css';

// CREATE THIS COMPONENT - ADD BEFORE THE MAIN APP FUNCTION
const AppContent = () => {
  const { user, loading, signIn, error } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setInitError(null);

        // Check Firebase connection
        const connectionStatus = await checkConnection();
        setIsConnected(connectionStatus);

        if (!connectionStatus) {
          throw new Error('Unable to connect to Firebase. Please check your internet connection.');
        }

        // Initialize database structure
        const initResult = await initializeDatabase();
        
        if (!initResult.success) {
          throw new Error(initResult.error || 'Failed to initialize database');
        }

        
      } catch (error) {
        
        setInitError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // Set up periodic connection check
    const connectionInterval = setInterval(async () => {
      const status = await checkConnection();
      setIsConnected(status);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(connectionInterval);
  }, []);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // ADD THIS - Check if user is authenticated
  if (!loading && !user) {
    return <LoginPage onLogin={signIn} loading={loading} error={error} />;
  }

  // Show loading screen while initializing
  if (isLoading || loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={60} />
        <Box textAlign="center">
          <h2>Initializing {APP_NAME}</h2>
          <p>Setting up your brick production management system...</p>
        </Box>
      </Box>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
        p={4}
      >
        <Alert severity="error" sx={{ maxWidth: 600, width: '100%' }}>
          <h3>Initialization Failed</h3>
          <p>{initError}</p>
          <p>Please check your Firebase configuration and try refreshing the page.</p>
        </Alert>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '12px 24px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Retry
        </button>
      </Box>
    );
  }

  // YOUR EXISTING APP CONTENT STARTS HERE - UNCHANGED
  return (
    <Router>
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
            transition: (theme) => theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: sidebarOpen ? 0 : '-240px',
            minHeight: '100vh',
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          {/* Header */}
          <Header 
            onMenuClick={handleSidebarToggle}
            isConnected={isConnected}
          />

          {/* Page content */}
          <Box sx={{ p: 3 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/production" element={<Production />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/customers" element={<CustomerManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Redirect unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>

      {/* Global snackbar for notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#4caf50',
              color: 'white',
            },
          },
          error: {
            style: {
              background: '#f44336',
              color: 'white',
            },
          },
        }}
      />

      {/* Connection status indicator */}
      {!isConnected && (
        <Snackbar
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ zIndex: 9999 }}
        >
          <Alert severity="warning" variant="filled">
            Connection lost. Trying to reconnect...
          </Alert>
        </Snackbar>
      )}
    </Router>
  );
};

// Create Material-UI theme - YOUR EXISTING THEME UNCHANGED
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#000000',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 300,
      fontSize: '6rem',
    },
    h2: {
      fontWeight: 300,
      fontSize: '3.75rem',
    },
    h3: {
      fontWeight: 400,
      fontSize: '3rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '2.125rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.75rem',
    },
    overline: {
      fontWeight: 400,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.3s ease-in-out',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
        containedPrimary: {
          backgroundColor: '#1976d2',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        },
        containedSecondary: {
          backgroundColor: '#dc004e',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#9a0036',
          },
        },
        containedError: {
          backgroundColor: '#f44336',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#d32f2f',
          },
        },
        containedWarning: {
          backgroundColor: '#ff9800',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#f57c00',
          },
        },
        containedInfo: {
          backgroundColor: '#2196f3',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1976d2',
          },
        },
        containedSuccess: {
          backgroundColor: '#4caf50',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#388e3c',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

// MODIFY THE MAIN APP FUNCTION - JUST WRAP WITH AuthProvider
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppProvider>
          <InventoryProvider>
            <AppContent />
          </InventoryProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;