import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Factory as FactoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  LocalShipping as TruckIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Import contexts
import { useApp } from '../../context/AppContext';

function QuickActions() {
  const navigate = useNavigate();
  const { actions: appActions } = useApp();

  // Quick action items
  const quickActions = [
    {
      id: 'add-production',
      title: 'Record Production',
      description: 'Add today\'s brick production',
      icon: <FactoryIcon />,
      color: 'primary',
      onClick: () => {
        navigate('/production');
        appActions.setCurrentPage('production');
      },
    },
    {
      id: 'record-sale',
      title: 'Record Sale',
      description: 'Add a new brick sale',
      icon: <ShoppingCartIcon />,
      color: 'secondary',
      onClick: () => {
        navigate('/sales');
        appActions.setCurrentPage('sales');
      },
    },
    {
      id: 'manage-inventory',
      title: 'Manage Inventory',
      description: 'Update stock levels',
      icon: <InventoryIcon />,
      color: 'success',
      onClick: () => {
        navigate('/inventory');
        appActions.setCurrentPage('inventory');
      },
    },
    {
      id: 'purchase-cement',
      title: 'Purchase Cement',
      description: 'Record cement purchase',
      icon: <TruckIcon />,
      color: 'warning',
      onClick: () => {
        navigate('/inventory');
        appActions.setCurrentPage('inventory');
        // You could also pass a parameter to open a specific tab or modal
      },
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Check performance metrics',
      icon: <AssessmentIcon />,
      color: 'info',
      onClick: () => {
        navigate('/gst-reports');
        appActions.setCurrentPage('gst-reports');
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure app settings',
      icon: <SettingsIcon />,
      color: 'inherit',
      onClick: () => {
        navigate('/settings');
        appActions.setCurrentPage('settings');
      },
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            Quick Actions
          </Typography>
          <Tooltip title="Add custom action">
            <IconButton size="small" color="primary">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={6} key={action.id}>
              <Button
                fullWidth
                variant="outlined"
                onClick={action.onClick}
                sx={{
                  p: 2,
                  height: 'auto',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.shadows[4],
                  },
                }}
                color={action.color === 'inherit' ? 'inherit' : action.color}
                startIcon={
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      backgroundColor: (theme) => {
                        if (action.color === 'inherit') return theme.palette.grey[100];
                        return `${theme.palette[action.color].main}20`;
                      },
                      color: (theme) => {
                        if (action.color === 'inherit') return theme.palette.text.secondary;
                        return theme.palette[action.color].main;
                      },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    {action.icon}
                  </Box>
                }
              >
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      display: 'block',
                      textTransform: 'none',
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="textSecondary"
                    sx={{ 
                      display: 'block',
                      textTransform: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {action.description}
                  </Typography>
                </Box>
              </Button>
              <Button>
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      display: 'block',
                      textTransform: 'none',
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="textSecondary"
                    sx={{ 
                      display: 'block',
                      textTransform: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {action.description}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Additional shortcuts */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Quick Shortcuts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              size="small" 
              variant="text" 
              onClick={() => navigate('/production')}
            >
              Today's Production
            </Button>
            <Button 
              size="small" 
              variant="text" 
              onClick={() => navigate('/sales')}
            >
              Recent Sales
            </Button>
            <Button 
              size="small" 
              variant="text" 
              onClick={() => navigate('/inventory')}
            >
              Stock Status
            </Button>
            <Button 
              size="small" 
              variant="text" 
              onClick={() => navigate('/reports')}
            >
              Monthly Report
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default QuickActions;