import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  LocalShipping as TruckIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

function InventoryCard({
  title,
  stock,
  unit,
  value,
  lastUpdated,
  alert = false,
  color = '#1976d2',
  icon,
  trend = null, // { direction: 'up|down', value: '5%', period: 'vs last week' }
  onAdjust = null,
  onPurchase = null, // Only for cement
  loading = false,
}) {
  // Format last updated date
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never updated';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just updated';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `Updated ${hours}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `Updated ${days}d ago`;
    }
  };

  // Format stock number
  const formatStock = (number) => {
    if (loading) return '-';
    return number.toLocaleString();
  };

  // Format value
  // const formatValue = (val) => {
  //   if (loading) return '$-.--';
  //   return `$${parseFloat(val).toLocaleString('en-US', { 
  //     minimumFractionDigits: 2, 
  //     maximumFractionDigits: 2 
  //   })}`;
  // };

  const formatValue = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        border: alert ? '2px solid' : '1px solid',
        borderColor: alert ? 'error.main' : 'divider',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[6],
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatLastUpdated(lastUpdated)}
              </Typography>
            </Box>
          </Box>
          
          {alert && (
            <Tooltip title="Low stock alert">
              <Chip
                icon={<WarningIcon />}
                label="Alert"
                color="error"
                size="small"
                variant="filled"
              />
            </Tooltip>
          )}
        </Box>

        {/* Main Stock Display */}
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              color: alert ? 'error.main' : 'text.primary',
              mb: 0.5,
            }}
          >
            {formatStock(stock)}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {unit} available
          </Typography>
        </Box>

        {/* Value and Trend */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Total Value
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: color }}>
              {formatValue(value)}
            </Typography>
          </Box>
          
          {trend && (
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trend.direction === 'up' ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography 
                  variant="body2" 
                  color={trend.direction === 'up' ? 'success.main' : 'error.main'}
                  sx={{ fontWeight: 600 }}
                >
                  {trend.value}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {trend.period}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {onAdjust && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onAdjust}
              size="small"
              sx={{ 
                borderColor: color,
                color: color,
                '&:hover': {
                  borderColor: color,
                  backgroundColor: alpha(color, 0.1),
                },
              }}
            >
              Adjust Stock
            </Button>
          )}
          
          {onPurchase && (
            <Button
              variant="contained"
              startIcon={<TruckIcon />}
              onClick={onPurchase}
              size="small"
              sx={{ 
                backgroundColor: color,
                '&:hover': {
                  backgroundColor: color,
                  opacity: 0.9,
                },
              }}
            >
              Purchase
            </Button>
          )}
        </Box>

        {/* Stock Status Indicator */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              Stock Status
            </Typography>
            <Chip
              label={alert ? 'Low Stock' : 'Normal'}
              size="small"
              color={alert ? 'error' : 'success'}
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Loading Overlay */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha('#fff', 0.8),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Loading...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default InventoryCard;