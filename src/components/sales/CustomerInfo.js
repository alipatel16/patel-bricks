import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useSales } from '../../hooks/useSales';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const CustomerInfo = ({ 
  selectedCustomer = null, 
  onCustomerSelect = () => {}, 
  onCustomerUpdate = () => {},
  showFullDetails = false 
}) => {
  const { sales, loadCustomers, saveCustomer } = useSales();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    business_name: '',
    gst_number: '',
    notes: '',
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const result = await loadCustomers();
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        business_name: customer.business_name || '',
        gst_number: customer.gst_number || '',
        notes: customer.notes || '',
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        business_name: '',
        gst_number: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      business_name: '',
      gst_number: '',
      notes: '',
    });
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (customerForm.phone && !/^\+?[\d\s\-()]+$/.test(customerForm.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (customerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        ...customerForm,
        id: editingCustomer?.id || Date.now().toString(),
        created_date: editingCustomer?.created_date || Date.now(),
        updated_date: Date.now(),
      };

      const result = await saveCustomer(customerData);
      if (result.success) {
        toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer added successfully');
        handleCloseDialog();
        loadCustomerData();
        onCustomerUpdate();
      } else {
        toast.error(result.error || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('An error occurred while saving customer');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCustomerStats = (customer) => {
    const customerSales = sales.history?.filter(sale => 
      sale.customer_phone === customer.phone || sale.customer_email === customer.email
    ) || [];
    
    const totalPurchases = customerSales.length;
    const totalAmount = customerSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalQuantity = customerSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    
    return { totalPurchases, totalAmount, totalQuantity };
  };

  if (loading && customers.length === 0) {
    return <LoadingSpinner message="Loading customer information..." />;
  }

  // If showing selected customer details only
  if (showFullDetails && selectedCustomer) {
    const stats = getCustomerStats(selectedCustomer);
    
    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Customer Details
            </Typography>
            <IconButton onClick={() => handleOpenDialog(selectedCustomer)}>
              <EditIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="textSecondary">Name</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedCustomer.name}
                  </Typography>
                </Box>
              </Box>

              {selectedCustomer.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Phone</Typography>
                    <Typography variant="body1">{selectedCustomer.phone}</Typography>
                  </Box>
                </Box>
              )}

              {selectedCustomer.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Email</Typography>
                    <Typography variant="body1">{selectedCustomer.email}</Typography>
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Purchase Summary</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip 
                  label={`${stats.totalPurchases} Transactions`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`${formatCurrency(stats.totalAmount)} Total`} 
                  color="success" 
                  size="small" 
                />
                <Chip 
                  label={`${stats.totalQuantity.toLocaleString()} Bricks`} 
                  color="info" 
                  size="small" 
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card elevation={2}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Customer Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Add Customer
            </Button>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search customers by name, phone, email, or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Customer List */}
          {filteredCustomers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                {searchTerm ? 'No customers found' : 'No customers added yet'}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first customer to get started'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer);
                
                return (
                  <Accordion key={customer.id} sx={{ mb: 1 }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      onClick={() => onCustomerSelect(customer)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PersonIcon color="primary" />
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              {customer.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {customer.phone || customer.email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                          <Chip 
                            label={`${stats.totalPurchases} orders`} 
                            size="small" 
                            color="primary"
                          />
                          <Chip 
                            label={formatCurrency(stats.totalAmount)} 
                            size="small" 
                            color="success"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>Contact Information</Typography>
                          
                          {customer.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">{customer.phone}</Typography>
                            </Box>
                          )}
                          
                          {customer.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">{customer.email}</Typography>
                            </Box>
                          )}
                          
                          {customer.address && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">{customer.address}</Typography>
                            </Box>
                          )}
                          
                          {customer.business_name && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <BusinessIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">{customer.business_name}</Typography>
                            </Box>
                          )}
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>Purchase History</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2">
                              Total Orders: <strong>{stats.totalPurchases}</strong>
                            </Typography>
                            <Typography variant="body2">
                              Total Amount: <strong>{formatCurrency(stats.totalAmount)}</strong>
                            </Typography>
                            <Typography variant="body2">
                              Total Bricks: <strong>{stats.totalQuantity.toLocaleString()}</strong>
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleOpenDialog(customer)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              startIcon={<ReceiptIcon />}
                              onClick={() => onCustomerSelect(customer)}
                            >
                              View Orders
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Customer Name *"
                fullWidth
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone Number"
                fullWidth
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Business Name"
                fullWidth
                value={customerForm.business_name}
                onChange={(e) => setCustomerForm({ ...customerForm, business_name: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={2}
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="GST Number"
                fullWidth
                value={customerForm.gst_number}
                onChange={(e) => setCustomerForm({ ...customerForm, gst_number: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                placeholder="Additional notes about the customer..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomer} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : editingCustomer ? 'Update' : 'Add Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerInfo;