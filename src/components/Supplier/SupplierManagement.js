// components/suppliers/SupplierManagement.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LocalShipping as SupplierIcon,
  ShoppingCart as PurchaseIcon,
  TrendingUp as StatsIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { supplierService } from '../../services/supplierService';
import { formatCurrency } from '../../utils/calculations';

// Import tab components (we'll create these next)
import SupplierList from './SupplierList';
import PurchaseList from './PurchaseList';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`supplier-tabpanel-${index}`}
      aria-labelledby={`supplier-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          py: 3, 
          px: 3, // FIXED: Added horizontal padding
          minHeight: 400 // FIXED: Ensure minimum height
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `supplier-tab-${index}`,
    'aria-controls': `supplier-tabpanel-${index}`,
  };
}

const SupplierManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [suppliersResult, purchasesResult, statsResult] = await Promise.all([
        supplierService.getAllSuppliers(),
        supplierService.getAllPurchases(),
        supplierService.getPurchaseStats(),
      ]);

      if (suppliersResult.success) {
        setSuppliers(suppliersResult.data);
      } else {
        console.error('Error loading suppliers:', suppliersResult.error);
      }

      if (purchasesResult.success) {
        setPurchases(purchasesResult.data);
      } else {
        console.error('Error loading purchases:', purchasesResult.error);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        console.error('Error loading stats:', statsResult.error);
      }

    } catch (error) {
      console.error('Error loading supplier data:', error);
      setError('Failed to load supplier data');
      toast.error('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSupplierAdded = (newSupplier) => {
    setSuppliers(prev => [newSupplier, ...prev]);
    toast.success('Supplier added successfully');
    // Reload stats
    loadData();
  };

  const handleSupplierUpdated = (updatedSupplier) => {
    setSuppliers(prev => prev.map(supplier => 
      supplier.id === updatedSupplier.id ? updatedSupplier : supplier
    ));
    toast.success('Supplier updated successfully');
  };

  const handleSupplierDeleted = (deletedSupplierId) => {
    setSuppliers(prev => prev.filter(supplier => supplier.id !== deletedSupplierId));
    toast.success('Supplier deleted successfully');
    // Reload stats
    loadData();
  };

  const handlePurchaseAdded = (newPurchase) => {
    setPurchases(prev => [newPurchase, ...prev]);
    toast.success('Purchase recorded successfully');
    // Reload stats and suppliers (to update supplier stats)
    loadData();
  };

  // FIXED: Add handlers for purchase update and delete
  const handlePurchaseUpdated = (updatedPurchase) => {
    setPurchases(prev => prev.map(purchase => 
      purchase.id === updatedPurchase.id ? updatedPurchase : purchase
    ));
    toast.success('Purchase updated successfully');
    // Reload stats and suppliers (to update supplier stats)
    loadData();
  };

  const handlePurchaseDeleted = (deletedPurchaseId) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== deletedPurchaseId));
    toast.success('Purchase deleted successfully');
    // Reload stats and suppliers (to update supplier stats)
    loadData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading supplier data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Supplier Management
        </Typography>
        
        {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SupplierIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Total Suppliers
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {suppliers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active suppliers registered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PurchaseIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="secondary">
                      Total Purchases
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total_purchases}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Purchase transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StatsIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Total Amount
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(stats.total_amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total purchase value
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StatsIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="info.main">
                      This Month
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(stats.this_month_amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.this_month_purchases} purchases
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ 
        width: '100%',
        boxShadow: 3, // FIXED: Enhanced shadow for better visual separation
        borderRadius: 2 // FIXED: Rounded corners
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="supplier management tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: 2, // FIXED: Increased vertical padding for tabs
                fontSize: '1rem' // FIXED: Larger font size
              }
            }}
          >
            <Tab
              label="Supplier List"
              {...a11yProps(0)}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            />
            <Tab
              label="Purchases"
              {...a11yProps(1)}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            />
          </Tabs>
        </Box>

        {/* Tab Panels with Enhanced Padding */}
        <TabPanel value={currentTab} index={0}>
          <SupplierList
            suppliers={suppliers}
            onSupplierAdded={handleSupplierAdded}
            onSupplierUpdated={handleSupplierUpdated}
            onSupplierDeleted={handleSupplierDeleted}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <PurchaseList
            purchases={purchases}
            suppliers={suppliers}
            onPurchaseAdded={handlePurchaseAdded}
            onPurchaseUpdated={handlePurchaseUpdated}
            onPurchaseDeleted={handlePurchaseDeleted}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SupplierManagement;