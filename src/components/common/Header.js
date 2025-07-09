import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CloudOff as CloudOffIcon,
  Cloud as CloudIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import contexts
import { useApp, useNotifications } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext'; // ADD THIS LINE

// Import constants
import { APP_NAME } from '../../utils/constants';

function Header({ isConnected = true }) {
  const navigate = useNavigate();
  const { currentPage, lastSyncTime } = useApp();
  const { notifications, removeNotification } = useNotifications();
  const { actions: inventoryActions } = useInventory();
  const { signOut, getUserDisplayName } = useAuth(); // ADD THIS LINE

  // State for menus
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);

  // Handle notification menu
  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleNotificationRemove = (notificationId) => {
    removeNotification(notificationId);
  };

  // Handle profile menu
  const handleProfileClick = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchor(null);
  };

  // ADD THIS FUNCTION - Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      handleProfileClose();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await inventoryActions.refreshInventory();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  // Format last sync time
  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get page title
  const getPageTitle = (page) => {
    const titles = {
      dashboard: 'Dashboard',
      production: 'Production',
      inventory: 'Inventory',
      sales: 'Sales',
      reports: 'Reports',
      settings: 'Settings',
    };
    return titles[page] || 'Dashboard';
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={2}
      sx={{
        backgroundColor: (theme) => theme.palette.primary.main,
        color: 'white',
        // Remove left margin since hamburger menu is now in sidebar
        marginLeft: 0,
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
        {/* Left side - App title and current page */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
              {APP_NAME}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', lineHeight: 1 }}>
              {getPageTitle(currentPage)}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Status and actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Connection status */}
          <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
            <Chip
              icon={isConnected ? <CloudIcon /> : <CloudOffIcon />}
              label={isConnected ? 'Online' : 'Offline'}
              size="small"
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          </Tooltip>

          {/* Refresh button */}
          <Tooltip title="Refresh Data">
            <IconButton
              color="inherit"
              onClick={handleRefresh}
              size="small"
              sx={{ ml: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationClick}
              size="small"
            >
              <Badge badgeContent={notifications?.length || 0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile menu - UPDATED TOOLTIP */}
          <Tooltip title={`Profile: ${getUserDisplayName ? getUserDisplayName() : 'User'}`}>
            <IconButton
              color="inherit"
              onClick={handleProfileClick}
              size="small"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                <SettingsIcon fontSize="small" />
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { maxWidth: 320, minWidth: 280 }
        }}
      >
        {!notifications?.length ? (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationRemove(notification.id)}
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                <Chip
                  label={notification.type}
                  size="small"
                  color={
                    notification.type === 'error' ? 'error' :
                    notification.type === 'warning' ? 'warning' :
                    notification.type === 'success' ? 'success' : 'default'
                  }
                />
                <Typography variant="caption" color="textSecondary">
                  {formatSyncTime(notification.timestamp)}
                </Typography>
              </Box>
              <Typography variant="body2">
                {notification.message}
              </Typography>
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Profile Menu - UPDATED WITH LOGOUT */}
      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={handleProfileClose}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {/* ADD THIS - User info at top */}
        <MenuItem disabled sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
          {getUserDisplayName ? getUserDisplayName() : 'User'}
        </MenuItem>
        <Divider />
        
        <MenuItem onClick={() => { navigate('/settings'); handleProfileClose(); }}>
          <SettingsIcon sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={() => { navigate('/reports'); handleProfileClose(); }}>
          <SettingsIcon sx={{ mr: 1 }} />
          Reports
        </MenuItem>
        <MenuItem onClick={handleProfileClose}>
          <SettingsIcon sx={{ mr: 1 }} />
          Help
        </MenuItem>
        
        {/* ADD THIS - Divider and Logout */}
        <Divider />
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            }
          }}
        >
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
}

export default Header;