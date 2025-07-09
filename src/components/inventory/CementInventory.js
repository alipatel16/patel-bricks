import { useState, useEffect } from 'react';
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
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Engineering as CementIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as PurchaseIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useInventory } from '../../hooks/useInventory';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const CementInventory = () => {
  const { inventory, updateCementStock, setCementStock, purchaseCement, loadInventoryData } = useInventory();
  const { cement, status } = inventory;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add', 'subtract', 'set', 'purchase'
  const [quantity, setQuantity] = useState('');
  const [costPerBag, setCostPerBag] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Set default cost per bag when dialog opens
  useEffect(() => {
    if (dialogOpen && (dialogType === 'purchase' || dialogType === 'add') && !costPerBag) {
      setCostPerBag(cement.cost_per_bag?.toString() || '25');
    }
  }, [dialogOpen, dialogType, cement.cost_per_bag, costPerBag]);

  const handleOpenDialog = (type = 'add') => {
    setDialogType(type);
    setQuantity('');
    setSupplier('');
    setNotes('');
    if (type === 'purchase' || type === 'add') {
      setCostPerBag(cement.cost_per_bag?.toString() || '25');
    } else {
      setCostPerBag('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setQuantity('');
    setCostPerBag('');
    setSupplier('');
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
      let noteText = notes;

      if (dialogType === 'purchase') {
        if (!costPerBag || isNaN(costPerBag) || parseFloat(costPerBag) <= 0) {
          toast.error('Please enter a valid cost per bag');
          setLoading(false);
          return;
        }

        result = await purchaseCement(
          qty,
          parseFloat(costPerBag),
          supplier || 'Local Supplier',
          noteText || `Purchased ${qty} bags of cement`
        );
      } else if (dialogType === 'set') {
        result = await setCementStock(qty, noteText || `Set stock to ${qty} bags`);
      } else {
        result = await updateCementStock(
          qty,
          dialogType,
          costPerBag ? parseFloat(costPerBag) : null,
          noteText || `${dialogType === 'add' ? 'Added' : 'Removed'} ${qty} bags`
        );
      }

      if (result.success) {
        toast.success(`Cement inventory ${getSuccessMessage()} successfully`);
        handleCloseDialog();
      } else {
        toast.error(result.error || 'Failed to update inventory');
      }
    } catch (error) {
      
      toast.error('An error occurred while updating inventory');
    } finally {
      setLoading(false);
    }
  };

  const getSuccessMessage = () => {
    switch (dialogType) {
      case 'purchase':
        return 'purchased';
      case 'add':
        return 'increased';
      case 'subtract':
        return 'decreased';
      case 'set':
        return 'updated';
      default:
        return 'updated';
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
    if (status.low_stock_alerts?.cement) {
      return { color: 'error', label: 'Low Stock', icon: <WarningIcon /> };
    }
    return { color: 'success', label: 'In Stock', icon: <CheckCircleIcon /> };
  };

  const calculateTotalValue = () => {
    return (cement.total_bags || 0) * (cement.cost_per_bag || 0);
  };

  const stockStatus = getStockStatus();

  if (cement.loading && !cement.total_bags) {
    return <LoadingSpinner message="Loading cement inventory..." />;
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
                  backgroundColor: '#f3e5f5',
                  color: '#7b1fa2',
                }}
              >
                <CementIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h5" component="h2" fontWeight={600}>
                  Cement Inventory
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Raw material stock and purchases
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
          {cement.loading && (
            <LinearProgress sx={{ mb: 2 }} />
          )}

          {/* Stock Information */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary" fontWeight={700}>
                  {formatNumber(cement.total_bags || 0)}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Bags
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight={600}>
                  {formatCurrency(cement.cost_per_bag || 0)}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Cost per Bag
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight={600}>
                  {formatCurrency(calculateTotalValue())}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total Value
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {cement.last_updated
                    ? new Date(cement.last_updated).toLocaleDateString('en-US', {
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
          {status.low_stock_alerts?.cement && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Low Stock Alert:</strong> Cement inventory is running low. Consider purchasing more bags.
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PurchaseIcon />}
              onClick={() => handleOpenDialog('purchase')}
              disabled={loading}
              color="success"
            >
              Purchase Cement
            </Button>
            
            <Button
              variant="outlined"
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
              disabled={loading || cement.total_bags === 0}
              color="error"
            >
              Remove Stock
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => handleOpenDialog('set')}
              disabled={loading}
            >
              Set Stock
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stock Management Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'purchase' && 'Purchase Cement'}
          {dialogType === 'add' && 'Add Cement Stock'}
          {dialogType === 'subtract' && 'Remove Cement Stock'}
          {dialogType === 'set' && 'Set Cement Stock'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {dialogType === 'set' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This will set the total stock to the specified amount.
              </Alert>
            )}

            <TextField
              autoFocus
              label={dialogType === 'set' ? 'New Total Stock (Bags)' : 'Quantity (Bags)'}
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              sx={{ mb: 2 }}
              inputProps={{ min: 0 }}
              helperText={
                dialogType === 'subtract' && quantity
                  ? `Available stock: ${formatNumber(cement.total_bags)} bags`
                  : ''
              }
            />

            {(dialogType === 'purchase' || dialogType === 'add') && (
              <TextField
                label="Cost per Bag ($)"
                type="number"
                fullWidth
                value={costPerBag}
                onChange={(e) => setCostPerBag(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: '0.01' }}
                helperText="This will update the default cost per bag"
              />
            )}

            {dialogType === 'purchase' && (
              <TextField
                label="Supplier Name"
                fullWidth
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Enter supplier name..."
              />
            )}

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for this transaction..."
            />

            {dialogType === 'purchase' && quantity && costPerBag && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Purchase Summary:
                </Typography>
                <Typography variant="body2">
                  Total Cost: {formatCurrency(parseInt(quantity || 0) * parseFloat(costPerBag || 0))}
                </Typography>
              </Box>
            )}
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
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CementInventory;