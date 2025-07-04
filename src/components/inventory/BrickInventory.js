import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useInventory } from '../../hooks/useInventory';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const BrickInventory = () => {
  const { inventory, updateBrickStock, setBrickStock, loadInventoryData } = useInventory();
  const { bricks, status } = inventory;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [operation, setOperation] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('relative'); // 'relative' or 'absolute'
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  const handleOpenDialog = (op = 'add') => {
    setOperation(op);
    setQuantity('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setQuantity('');
    setNotes('');
  };

  const handleStockUpdate = async () => {
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const qty = parseInt(quantity);
    setLoading(true);

    try {
      let result;
      const noteText = notes || `${operation === 'add' ? 'Added' : 'Removed'} ${qty} bricks`;

      if (adjustmentType === 'absolute') {
        result = await setBrickStock(qty, noteText);
      } else {
        result = await updateBrickStock(qty, operation, noteText);
      }

      if (result.success) {
        toast.success(`Brick inventory ${operation === 'add' ? 'increased' : 'decreased'} successfully`);
        handleCloseDialog();
      } else {
        toast.error(result.error || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating brick inventory:', error);
      toast.error('An error occurred while updating inventory');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStockStatus = () => {
    if (status.low_stock_alerts?.bricks) {
      return { color: 'error', label: 'Low Stock', icon: <WarningIcon /> };
    }
    return { color: 'success', label: 'In Stock', icon: <CheckCircleIcon /> };
  };

  const stockStatus = getStockStatus();

  if (bricks.loading && !bricks.total_stock) {
    return <LoadingSpinner message="Loading brick inventory..." />;
  }

  return (
    <Box>
      <Card elevation={2}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                }}
              >
                <InventoryIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h5" component="h2" fontWeight={600}>
                  Brick Inventory
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Current stock levels and management
                </Typography>
              </Box>
            </Box>
            
            <Chip
              icon={stockStatus.icon}
              label={stockStatus.label}
              color={stockStatus.color}
              variant="outlined"
            />
          </Box>

          {/* Loading Progress */}
          {bricks.loading && (
            <LinearProgress sx={{ mb: 2 }} />
          )}

          {/* Stock Information */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary" fontWeight={700}>
                  {formatNumber(bricks.total_stock || 0)}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Bricks
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight={600}>
                  {formatCurrency(parseFloat(status.inventory_value?.brickValue || 0))}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Inventory Value
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {bricks.last_updated
                    ? new Date(bricks.last_updated).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'
                  }
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Stock Alert */}
          {status.low_stock_alerts?.bricks && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Low Stock Alert:</strong> Brick inventory is running low. Consider restocking soon.
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('add')}
              disabled={loading}
            >
              Add Stock
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RemoveIcon />}
              onClick={() => handleOpenDialog('subtract')}
              disabled={loading || bricks.total_stock === 0}
            >
              Remove Stock
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                setAdjustmentType('absolute');
                handleOpenDialog('set');
              }}
              disabled={loading}
            >
              Set Stock
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {operation === 'add' && 'Add Brick Stock'}
          {operation === 'subtract' && 'Remove Brick Stock'}
          {operation === 'set' && 'Set Brick Stock'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {adjustmentType === 'absolute' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This will set the total stock to the specified amount.
              </Alert>
            )}

            <TextField
              autoFocus
              label={adjustmentType === 'absolute' ? 'New Total Stock' : 'Quantity'}
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              sx={{ mb: 2 }}
              inputProps={{ min: 0 }}
              helperText={
                adjustmentType === 'relative' && operation === 'subtract' && quantity
                  ? `Available stock: ${formatNumber(bricks.total_stock)}`
                  : ''
              }
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for this stock adjustment..."
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleStockUpdate}
            variant="contained"
            disabled={loading || !quantity}
          >
            {loading ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrickInventory;