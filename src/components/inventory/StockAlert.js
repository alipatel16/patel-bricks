import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Typography,
  Grid,
  Paper,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  LocalShipping as TruckIcon,
  Add as AddIcon,
} from '@mui/icons-material';

function StockAlert({ 
  brickAlert = false, 
  cementAlert = false, 
  brickStock = 0, 
  cementStock = 0,
  onAction = null 
}) {
  // Don't render if no alerts
  if (!brickAlert && !cementAlert) {
    return null;
  }

  return (
    <Alert 
      severity="warning" 
      sx={{ 
        mb: 3,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
      icon={<WarningIcon />}
    >
      <AlertTitle sx={{ fontWeight: 600, mb: 2 }}>
        Stock Alert - Immediate Action Required
      </AlertTitle>
      
      <Grid container spacing={2}>
        {/* Brick Alert */}
        {brickAlert && (
          <Grid item xs={12} md={6}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                borderColor: 'warning.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <InventoryIcon color="warning" />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Brick Stock Low
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Current stock: {brickStock.toLocaleString()} bricks
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                Your brick inventory is running low. Consider increasing production 
                or adjusting stock levels to avoid production delays.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {onAction && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<AddIcon />}
                      onClick={() => onAction('brick-adjust')}
                    >
                      Adjust Stock
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => window.location.href = '/production'}
                    >
                      Record Production
                    </Button>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Cement Alert */}
        {cementAlert && (
          <Grid item xs={12} md={6}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                borderColor: 'error.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TruckIcon color="error" />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Cement Stock Critical
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Current stock: {cementStock.toLocaleString()} bags
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                Your cement inventory is critically low. Production may be halted 
                if new cement is not purchased immediately.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {onAction && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<TruckIcon />}
                      onClick={() => onAction('cement-purchase')}
                    >
                      Purchase Cement
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<AddIcon />}
                      onClick={() => onAction('cement-adjust')}
                    >
                      Adjust Stock
                    </Button>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Summary Actions */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {brickAlert && (
              <Chip
                label={`Bricks: ${brickStock.toLocaleString()}`}
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
            {cementAlert && (
              <Chip
                label={`Cement: ${cementStock.toLocaleString()} bags`}
                color="error"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          
          <Typography variant="caption" color="textSecondary">
            Configure alert thresholds in Settings
          </Typography>
        </Box>
      </Box>
    </Alert>
  );
}

export default StockAlert;