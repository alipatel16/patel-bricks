import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  LocalShipping as TruckIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Import contexts
import { useApp } from '../context/AppContext';
import { useInventory, useBrickInventory, useCementInventory } from '../context/InventoryContext';

// Import components
import InventoryCard from '../components/inventory/InventoryCard';
import StockAlert from '../components/inventory/StockAlert';

// ✅ NEW: Import services for calculated stock
import { productionService } from '../services/productionService';
import { salesService } from '../services/salesService';

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
  const { actions: appActions, settings } = useApp();
  const { 
    status, 
    history, 
    actions: inventoryActions,
    isLoading,
    lowStockAlerts,
    inventoryValue 
  } = useInventory();
  
  const { bricks } = useBrickInventory();
  const { cement } = useCementInventory();

  // ✅ NEW: State for calculated brick stock
  const [calculatedBrickStock, setCalculatedBrickStock] = useState(0);

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'brick-adjust', 'cement-purchase', 'cement-adjust'
  const [historyData, setHistoryData] = useState([]);

  // Form management
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      quantity: '',
      operation: 'add',
      notes: '',
      costPerBag: '',
      supplier: '',
    }
  });

  // ✅ NEW: Function to calculate actual brick stock (same as Dashboard.js)
  const calculateActualBrickStock = async () => {
    try {
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

  // ✅ NEW: Load calculated brick stock
  const loadCalculatedBrickStock = async () => {
    const stock = await calculateActualBrickStock();
    setCalculatedBrickStock(stock);
  };

  // Load inventory history on mount
  useEffect(() => {
    loadInventoryHistory();
  }, []);

  // ✅ NEW: Load calculated brick stock on mount and refresh periodically
  useEffect(() => {
    loadCalculatedBrickStock();
    
    // Refresh every 30 seconds to stay in sync with Dashboard
    const interval = setInterval(loadCalculatedBrickStock, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Load inventory history
  const loadInventoryHistory = async () => {
    try {
      await inventoryActions.loadHistory('all', 100);
    } catch (error) {
      console.error('Error loading inventory history:', error);
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
          result = await inventoryActions.purchaseCement(
            quantity,
            parseFloat(data.costPerBag),
            data.supplier,
            data.notes
          );
          break;

        default:
          throw new Error('Invalid dialog type');
      }

      if (result.success) {
        handleCloseDialog();
        loadInventoryHistory();
        // ✅ NEW: Refresh calculated stock after brick operations
        if (dialogType === 'brick-adjust') {
          loadCalculatedBrickStock();
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Inventory Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Monitor and manage your brick and cement inventory levels
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
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
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stock Alerts */}
      {(lowStockAlerts.bricks || lowStockAlerts.cement) && (
        <StockAlert 
          brickAlert={lowStockAlerts.bricks}
          cementAlert={lowStockAlerts.cement}
          brickStock={calculatedBrickStock}
          cementStock={cement.total_bags}
          onAction={handleOpenDialog}
        />
      )}

      {/* Inventory Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <InventoryCard
            title="Brick Inventory"
            stock={calculatedBrickStock}
            unit="bricks"
            value={inventoryValue.brickValue}
            lastUpdated={bricks.last_updated}
            alert={lowStockAlerts.bricks}
            color="#2196f3"
            icon={<InventoryIcon />}
            onAdjust={() => handleOpenDialog('brick-adjust')}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <InventoryCard
            title="Cement Inventory"
            stock={cement.total_bags}
            unit="bags"
            value={inventoryValue.cementValue}
            lastUpdated={cement.last_updated}
            alert={lowStockAlerts.cement}
            color="#ff9800"
            icon={<TruckIcon />}
            onAdjust={() => handleOpenDialog('cement-adjust')}
            onPurchase={() => handleOpenDialog('cement-purchase')}
          />
        </Grid>
      </Grid>

      {/* Inventory Value Summary */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Inventory Value Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <MoneyIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  ₹{inventoryValue.brickValue}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Brick Value
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <TruckIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                  ₹{inventoryValue.cementValue}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cement Value
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  ₹{inventoryValue.totalValue}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Value
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
                    Total bricks available (Production - Sales)
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog('brick-adjust')}
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
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No transaction history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.transactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        {formatDate(transaction.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          size="small"
                          color={transaction.type === 'brick' ? 'primary' : 'warning'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.category}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {transaction.quantity || transaction.bags || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {transaction.total_cost ? `$${transaction.total_cost}` : '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
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