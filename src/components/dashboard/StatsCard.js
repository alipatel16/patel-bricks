import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  alpha,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = '#1976d2', 
  alert = false,
  trend = null, // { direction: 'up|down', value: '12%' }
  onClick = null,
  loading = false 
}) {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        } : {},
        border: alert ? '2px solid' : 'none',
        borderColor: alert ? 'error.main' : 'transparent',
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header with icon and alert */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            mb: 2 
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          
          {alert && (
            <Chip
              icon={<WarningIcon />}
              label="Alert"
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Title */}
        <Typography 
          variant="subtitle2" 
          color="textSecondary" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontSize: '0.75rem',
          }}
        >
          {title}
        </Typography>

        {/* Main value */}
        <Typography 
          variant="h4" 
          component="div" 
          sx={{ 
            fontWeight: 700,
            mb: 1,
            color: alert ? 'error.main' : 'text.primary',
          }}
        >
          {loading ? '-' : value}
        </Typography>

        {/* Subtitle and trend */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ fontSize: '0.875rem' }}
          >
            {subtitle}
          </Typography>
          
          {trend && (
            <Chip
              label={`${trend.direction === 'up' ? '+' : '-'}${trend.value}`}
              size="small"
              color={trend.direction === 'up' ? 'success' : 'error'}
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Loading state */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha('#fff', 0.7),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="textSecondary">
              Loading...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default StatsCard;