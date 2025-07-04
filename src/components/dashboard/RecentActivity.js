import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Button,
} from '@mui/material';
import {
  Factory as FactoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

function RecentActivity({ activities = [], onRefresh = null, maxItems = 5 }) {
  // Activity type configuration
  const activityConfig = {
    production: {
      icon: <FactoryIcon />,
      color: '#4caf50',
      backgroundColor: '#e8f5e8',
    },
    sale: {
      icon: <ShoppingCartIcon />,
      color: '#2196f3',
      backgroundColor: '#e3f2fd',
    },
    alert: {
      icon: <WarningIcon />,
      color: '#ff9800',
      backgroundColor: '#fff3e0',
    },
    info: {
      icon: <InfoIcon />,
      color: '#607d8b',
      backgroundColor: '#f5f5f5',
    },
    success: {
      icon: <CheckCircleIcon />,
      color: '#4caf50',
      backgroundColor: '#e8f5e8',
    },
    error: {
      icon: <ErrorIcon />,
      color: '#f44336',
      backgroundColor: '#ffebee',
    },
  };

  // Get activity configuration
  const getActivityConfig = (activity) => {
    return activityConfig[activity.type] || activityConfig.info;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Get status chip color
  const getStatusColor = (status) => {
    const statusMap = {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
      completed: 'success',
      pending: 'warning',
      failed: 'error',
    };
    return statusMap[status] || 'default';
  };

  // Limit activities to maxItems
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            Recent Activity
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onRefresh && (
              <Tooltip title="Refresh activity">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="More options">
              <IconButton size="small">
                <MoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {displayedActivities.length === 0 ? (
          // Empty state
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <InfoIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1" gutterBottom>
              No recent activity
            </Typography>
            <Typography variant="body2">
              Activity will appear here as you use the system
            </Typography>
          </Box>
        ) : (
          // Activity list
          <List sx={{ p: 0 }}>
            {displayedActivities.map((activity, index) => {
              const config = getActivityConfig(activity);
              
              return (
                <ListItem
                  key={activity.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    borderBottom: index < displayedActivities.length - 1 ? '1px solid' : 'none',
                    borderBottomColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: config.backgroundColor,
                        color: config.color,
                      }}
                    >
                      {config.icon}
                    </Avatar>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            lineHeight: 1.4,
                            flex: 1,
                            mr: 1,
                          }}
                        >
                          {activity.description}
                        </Typography>
                        {activity.status && (
                          <Chip
                            label={activity.status}
                            size="small"
                            color={getStatusColor(activity.status)}
                            variant="outlined"
                            sx={{ 
                              height: 20,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {formatTimestamp(activity.timestamp)}
                        </Typography>
                        
                        {activity.amount && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: activity.type === 'sale' ? 'success.main' : 'text.secondary',
                            }}
                          >
                            {activity.amount}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        {/* Show more button if there are more activities */}
        {activities.length > maxItems && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                // Navigate to activity log or expand view
                console.log('Show more activities');
              }}
            >
              View all activities ({activities.length})
            </Button>
          </Box>
        )}

        {/* Quick stats */}
        {displayedActivities.length > 0 && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Activity Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {Object.entries(
                displayedActivities.reduce((acc, activity) => {
                  acc[activity.type] = (acc[activity.type] || 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${count} ${type}${count > 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'capitalize',
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivity;