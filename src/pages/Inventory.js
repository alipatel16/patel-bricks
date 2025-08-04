import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as TruckIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Import contexts
import { useApp } from '../context/AppContext';
import { useInventory, useBrickInventory, useCementInventory } from '../context/InventoryContext';

// Import services for calculated stock
import { productionService } from '../services/productionService';
import { salesService } from '../services/salesService';

// Import separate components
import CementPurchaseHistory from '../components/inventory/CementPurchaseHistory';
import TransactionHistory from '../components/inventory/TransactionHistory';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Inventory() {
  const theme = useTheme();
  const { actions: appActions, settings } = useApp();
  const { 
    actions: inventoryActions,
    isLoading,
    lowStockAlerts,
    inventoryValue 
  } = useInventory();
  
  const { bricks } = useBrickInventory();
  const { cement } = useCementInventory();

  // State for calculated brick stock
  const [calculatedBrickStock, setCalculatedBrickStock] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'brick-adjust', 'cement-purchase', 'cement-adjust'

  // Form management
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      quantity: '',
      operation: 'add',
      notes: '',
      costPerBag: '',
      supplier: '',
      date: new Date().toISOString().split('T')[0],
    }
  });

  // Function to calculate actual brick stock
  const calculateActualBrickStock = async () => {
    try {
      // Fetch all required data including manual adjustments
      const [productionResult, salesResult] = await Promise.all([
        productionService.getProductionHistory(1000),
        salesService.getAllSales(),
      ]);

      const totalProduction = productionResult.success && productionResult.data
        ? productionResult.data.reduce((sum, prod) => sum + (parseInt(prod.quantity) || 0), 0)
        : 0;

      const totalSales = salesResult.success && salesResult.data
        ? salesResult.data.reduce((sum, sale) => sum + (parseInt(sale.quantity) || 0), 0)
        : 0;

      return totalProduction - totalSales;
    } catch (error) {
      console.error('Error calculating brick stock:', error);
      return 0;
    }
  };

  // Load calculated brick stock
  const loadCalculatedBrickStock = async () => {
    const stock = await calculateActualBrickStock();
    setCalculatedBrickStock(stock);
  };

  // Load calculated brick stock on mount and refresh periodically
  useEffect(() => {
    loadCalculatedBrickStock();
    
    // Refresh every 30 seconds to stay in sync with Dashboard
    const interval = setInterval(loadCalculatedBrickStock, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCalculatedBrickStock(),
        inventoryActions.refreshInventory()
      ]);
      appActions.showNotification('Inventory data refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing inventory:', error);
      appActions.showNotification('Failed to refresh inventory data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle dialog operations
  const handleOpenDialog = (type) => {
    setDialogType(type);
    reset();
    if (type === 'cement-purchase') {
      reset({
        quantity: '',
        costPerBag: cement.cost_per_bag || 25,
        supplier: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    reset();
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      let result;
      const quantity = parseInt(data.quantity);

      switch (dialogType) {
        case 'brick-adjust':
          result = await inventoryActions.updateBrickStock(
            quantity,
            data.operation,
            data.notes
          );
          break;

        case 'cement-adjust':
          result = await inventoryActions.updateCementStock(
            quantity,
            data.operation,
            parseFloat(data.costPerBag) || null,
            data.notes
          );
          break;

        case 'cement-purchase':
          result = await inventoryActions.purchaseCementWithDate(
            quantity,
            parseFloat(data.costPerBag),
            data.supplier,
            data.notes,
            data.date
          );
          break;

        default:
          throw new Error('Invalid dialog type');
      }

      if (result.success) {
        handleCloseDialog();
        // Refresh calculated stock after brick operations
        if (dialogType === 'brick-adjust') {
          loadCalculatedBrickStock();
        }
        appActions.showNotification('Operation completed successfully', 'success');
      }
    } catch (error) {
      console.error('Operation failed:', error);
      appActions.showNotification('Operation failed', 'error');
    }
  };

  // Get dialog title
  const getDialogTitle = () => {
    switch (dialogType) {
      case 'brick-adjust':
        return 'Adjust Brick Stock';
      case 'cement-adjust':
        return 'Adjust Cement Stock';
      case 'cement-purchase':
        return 'Purchase Cement';
      default:
        return 'Inventory Operation';
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Header - Consistent with other pages */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Inventory Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Monitor and manage your brick and cement inventory levels.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh inventory data">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setCurrentTab(2)}
          >
            View History
          </Button>
        </Box>
      </Box>

      {/* Loading indicator */}
      {(isLoading || refreshing) && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stock Alerts */}
      {(lowStockAlerts.bricks || lowStockAlerts.cement) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Stock Alert
          </Typography>
          <Typography variant="body2">
            {lowStockAlerts.bricks && `Low brick stock: ${calculatedBrickStock} bricks remaining. `}
            {lowStockAlerts.cement && `Low cement stock: ${cement.total_bags} bags remaining. `}
            Consider restocking soon.
          </Typography>
        </Alert>
      )}

      {/* Stats Cards - Consistent Design with Fixed Heights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Brick Stock */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Brick Stock
                  </Typography>
                  <Typography variant="h5" component="div">
                    {calculatedBrickStock.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks available
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  <InventoryIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cement Stock */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Cement Stock
                  </Typography>
                  <Typography variant="h5" component="div">
                    {cement.total_bags}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bags available
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                  }}
                >
                  <TruckIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Inventory Value */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Total Value
                  </Typography>
                  <Typography variant="h5" component="div">
                    ₹{inventoryValue.totalValue}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Inventory worth
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                  }}
                >
                  <MoneyIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory Value Breakdown */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Inventory Value Breakdown
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Brick Value
                </Typography>
                <Typography variant="h6" color="primary">
                  ₹{inventoryValue.brickValue}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Cement Value
                </Typography>
                <Typography variant="h6" color="warning.main">
                  ₹{inventoryValue.cementValue}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Total Value
                </Typography>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                  ₹{inventoryValue.totalValue}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{padding : 1}}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Brick Inventory" />
            <Tab label="Cement Inventory" />
            <Tab label="Transaction History" />
            <Tab label="Cement Purchase History"/>
          </Tabs>
        </Box>

        {/* Brick Inventory Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Stock (Calculated)
                  </Typography>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 600, mb: 2 }}>
                    {calculatedBrickStock.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total bricks available (Production - Sales + Adjustments)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stock Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Last Updated:
                      </Typography>
                      <Typography variant="body2">
                        {bricks.last_updated ? formatDate(bricks.last_updated) : 'Never'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Alert Threshold:
                      </Typography>
                      <Typography variant="body2">
                        {settings.low_stock_alert?.bricks || 1000} bricks
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Status:
                      </Typography>
                      <Chip
                        label={calculatedBrickStock < 1000 ? 'Low Stock' : 'Normal'}
                        color={calculatedBrickStock < 1000 ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Cement Inventory Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Stock
                  </Typography>
                  <Typography variant="h3" color="warning.main" sx={{ fontWeight: 600, mb: 2 }}>
                    {cement.total_bags.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Bags available
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<TruckIcon />}
                      onClick={() => handleOpenDialog('cement-purchase')}
                      size="small"
                      color="warning"
                    >
                      Purchase Cement
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog('cement-adjust')}
                      size="small"
                    >
                      Adjust Stock
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stock Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Cost per Bag:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{cement.cost_per_bag}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Last Updated:
                      </Typography>
                      <Typography variant="body2">
                        {cement.last_updated ? formatDate(cement.last_updated) : 'Never'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Alert Threshold:
                      </Typography>
                      <Typography variant="body2">
                        {settings.low_stock_alert?.cement || 10} bags
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Status:
                      </Typography>
                      <Chip
                        label={lowStockAlerts.cement ? 'Low Stock' : 'Normal'}
                        color={lowStockAlerts.cement ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Transaction History Tab */}
        <TabPanel value={currentTab} index={2}>
          <TransactionHistory />
        </TabPanel>

        {/* Cement Purchase History Tab */}
        <TabPanel value={currentTab} index={3}>
          <CementPurchaseHistory />
        </TabPanel>
      </Card>

      {/* Inventory Operation Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {/* Date field for cement purchase */}
              {dialogType === 'cement-purchase' && (
                <Controller
                  name="date"
                  control={control}
                  rules={{
                    required: "Purchase date is required",
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Purchase Date"
                      type="date"
                      fullWidth
                      error={!!errors.date}
                      helperText={errors.date?.message}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  )}
                />
              )}

              <Controller
                name="quantity"
                control={control}
                rules={{ 
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={dialogType === 'cement-purchase' ? 'Bags to Purchase' : 'Quantity'}
                    type="number"
                    fullWidth
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                  />
                )}
              />

              {dialogType !== 'cement-purchase' && (
                <Controller
                  name="operation"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Operation</InputLabel>
                      <Select {...field} label="Operation">
                        <MenuItem value="add">Add to Stock</MenuItem>
                        <MenuItem value="subtract">Remove from Stock</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              )}

              {(dialogType === 'cement-purchase' || dialogType === 'cement-adjust') && (
                <Controller
                  name="costPerBag"
                  control={control}
                  rules={{ 
                    required: 'Cost per bag is required',
                    min: { value: 0.01, message: 'Cost must be greater than 0' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Cost per Bag (₹)"
                      type="number"
                      step="0.01"
                      fullWidth
                      error={!!errors.costPerBag}
                      helperText={errors.costPerBag?.message}
                    />
                  )}
                />
              )}

              {dialogType === 'cement-purchase' && (
                <Controller
                  name="supplier"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Supplier (optional)"
                      fullWidth
                    />
                  )}
                />
              )}

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes (optional)"
                    multiline
                    rows={3}
                    fullWidth
                  />
                )}
              />
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? null : <CheckCircleIcon />}
            >
              {isSubmitting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Inventory;