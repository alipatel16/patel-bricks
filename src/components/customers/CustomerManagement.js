// components/customers/CustomerManagement.js - Consistent Design Version
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
  InputAdornment,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CardHeader,
  Stack,
  ButtonGroup,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { customerService } from '../../services/customerService';
import { INDIAN_STATES } from '../../utils/constants';
import { formatCurrency } from '../../utils/calculations';
import toast from 'react-hot-toast';

const CustomerManagement = () => {
  const theme = useTheme();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  
  // Customer Dialog State
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    business_name: '',
    gstin: '',
    notes: ''
  });

  // Location Dialog State
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    pincode: '',
    state: 'GJ',
    state_code: '24',
    brick_rate: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await customerService.getAllCustomers();
      if (result.success) {
        setCustomers(result.data || []);
      } else {
        toast.error('Failed to load customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomers();
      toast.success('Customer data refreshed');
    } catch (error) {
      console.error('Error refreshing customers:', error);
      toast.error('Failed to refresh customer data');
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced filtering and sorting
  const getFilteredAndSortedCustomers = () => {
    let filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.business_name && customer.business_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply filters
    if (filterBy === 'business') {
      filtered = filtered.filter(customer => customer.business_name);
    } else if (filterBy === 'high_value') {
      filtered = filtered.filter(customer => (customer.total_amount || 0) > 50000);
    } else if (filterBy === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(customer => 
        customer.last_purchase && new Date(customer.last_purchase) > thirtyDaysAgo
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.last_purchase || 0) - new Date(a.last_purchase || 0);
        case 'amount':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'purchases':
          return (b.total_purchases || 0) - (a.total_purchases || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Customer Dialog Functions
  const handleOpenCustomerDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        business_name: customer.business_name || '',
        gstin: customer.gstin || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        business_name: '',
        gstin: '',
        notes: ''
      });
    }
    setCustomerDialogOpen(true);
  };

  const handleCloseCustomerDialog = () => {
    setCustomerDialogOpen(false);
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      business_name: '',
      gstin: '',
      notes: ''
    });
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (editingCustomer) {
        result = await customerService.updateCustomer(editingCustomer.id, customerForm);
      } else {
        result = await customerService.createCustomer(customerForm);
      }

      if (result.success) {
        toast.success(result.message);
        await loadCustomers();
        handleCloseCustomerDialog();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  // Location Dialog Functions
  const handleOpenLocationDialog = (customer, location = null) => {
    setSelectedCustomer(customer);
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name || '',
        address: location.address || '',
        contact_person: location.contact_person || '',
        contact_phone: location.contact_phone || '',
        pincode: location.pincode || '',
        state: location.state || 'GJ',
        state_code: location.state_code || '24',
        brick_rate: customer.brick_rates?.[location.id] || ''
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        name: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        pincode: '',
        state: 'GJ',
        state_code: '24',
        brick_rate: ''
      });
    }
    setLocationDialogOpen(true);
  };

  const handleCloseLocationDialog = () => {
    setLocationDialogOpen(false);
    setSelectedCustomer(null);
    setEditingLocation(null);
    setLocationForm({
      name: '',
      address: '',
      contact_person: '',
      contact_phone: '',
      pincode: '',
      state: 'GJ',
      state_code: '24',
      brick_rate: ''
    });
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name || !locationForm.address) {
      toast.error('Location name and address are required');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (editingLocation) {
        result = await customerService.updateCustomerLocation(
          selectedCustomer.id,
          editingLocation.id,
          locationForm
        );
      } else {
        result = await customerService.addCustomerLocation(
          selectedCustomer.id,
          locationForm
        );
      }

      if (result.success) {
        toast.success(result.message);
        await loadCustomers();
        handleCloseLocationDialog();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (customerId, locationId) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      setLoading(true);
      try {
        const result = await customerService.deleteCustomerLocation(customerId, locationId);
        if (result.success) {
          toast.success('Location deleted successfully');
          await loadCustomers();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error('Error deleting location:', error);
        toast.error('Failed to delete location');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      setLoading(true);
      try {
        const result = await customerService.deleteCustomer(customerId);
        if (result.success) {
          toast.success('Customer deleted successfully');
          await loadCustomers();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer');
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredCustomers = getFilteredAndSortedCustomers();

  return (
    <Box>
      {/* Header - Consistent with Sales/Dashboard */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Customer Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your customers, locations, and pricing efficiently.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh customer data">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCustomerDialog()}
            sx={{ borderRadius: 2 }}
          >
            Add Customer
          </Button>
        </Box>
      </Box>

      {/* Loading indicator */}
      {(loading || refreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Stats Cards - Consistent Design with Fixed Heights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Customers */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Total Customers
                  </Typography>
                  <Typography variant="h5" component="div">
                    {customers.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active customers
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
                  <GroupIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Clients */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Business Clients
                  </Typography>
                  <Typography variant="h5" component="div">
                    {customers.filter(c => c.business_name).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Corporate accounts
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
                  <BusinessIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Locations */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Total Locations
                  </Typography>
                  <Typography variant="h5" component="div">
                    {customers.reduce((total, customer) => total + (customer.locations?.length || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Delivery locations
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
                  <LocationIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Revenue */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(customers.reduce((total, customer) => total + (customer.total_amount || 0), 0))}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Lifetime value
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                  }}
                >
                  <TrendingUpIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Controls - Simplified */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search customers by name, phone, or business..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="name">Name (A-Z)</MenuItem>
                  <MenuItem value="recent">Recent Activity</MenuItem>
                  <MenuItem value="amount">Total Amount</MenuItem>
                  <MenuItem value="purchases">Total Purchases</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={filterBy}
                  label="Filter"
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  <MenuItem value="all">All Customers</MenuItem>
                  <MenuItem value="business">Business Only</MenuItem>
                  <MenuItem value="high_value">High Value (>₹50K)</MenuItem>
                  <MenuItem value="recent">Recent (30 days)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Customers List - Simplified Design */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <GroupIcon 
              sx={{ 
                fontSize: 64,
                color: theme.palette.grey[400],
                mb: 2
              }}
            />
            <Typography variant="h6" gutterBottom>
              {customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {customers.length === 0 
                ? 'Add your first customer to get started with customer management'
                : 'Try adjusting your search terms or filters'
              }
            </Typography>
            {customers.length === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCustomerDialog()}
              >
                Add First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        filteredCustomers.map((customer) => (
          <Card key={customer.id} sx={{ mb: 2 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    }}
                  >
                    {customer.business_name ? <BusinessIcon /> : <PersonIcon />}
                  </Box>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="medium">
                      {customer.name}
                      {customer.business_name && (
                        <Chip 
                          label="Business" 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {customer.phone} • {customer.locations?.length || 0} location(s)
                      {customer.business_name && ` • ${customer.business_name}`}
                    </Typography>
                  </Box>
                  
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={formatCurrency(customer.total_amount || 0)}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${customer.total_purchases || 0} orders`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Customer Details */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader
                        title="Customer Details"
                        avatar={
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 2,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                            }}
                          >
                            <PersonIcon />
                          </Box>
                        }
                        action={
                          <ButtonGroup size="small">
                            <Button
                              startIcon={<EditIcon />}
                              onClick={() => handleOpenCustomerDialog(customer)}
                            >
                              Edit
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              Delete
                            </Button>
                          </ButtonGroup>
                        }
                      />
                      <CardContent>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Email</Typography>
                            <Typography variant="body1">{customer.email || 'Not provided'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                            <Typography variant="body1">{customer.gstin || 'Not provided'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Last Purchase</Typography>
                            <Typography variant="body1">{customer.last_purchase || 'No purchases yet'}</Typography>
                          </Box>
                          {customer.notes && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Notes</Typography>
                              <Typography variant="body1">{customer.notes}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Locations */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader
                        title={`Locations (${customer.locations?.length || 0})`}
                        avatar={
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 2,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                            }}
                          >
                            <LocationIcon />
                          </Box>
                        }
                        action={
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenLocationDialog(customer)}
                          >
                            Add Location
                          </Button>
                        }
                      />
                      <CardContent>
                        {customer.locations && customer.locations.length > 0 ? (
                          <List dense>
                            {customer.locations.map((location) => (
                              <ListItem 
                                key={location.id} 
                                divider
                                sx={{
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 1,
                                  mb: 1,
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <HomeIcon color="action" fontSize="small" />
                                      <Typography variant="subtitle2">
                                        {location.name}
                                      </Typography>
                                      {location.is_primary && (
                                        <Chip label="Primary" size="small" color="primary" />
                                      )}
                                    </Box>
                                  }
                                  secondary={
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        {location.address}
                                      </Typography>
                                      {customer.brick_rates?.[location.id] && (
                                        <Chip
                                          label={`₹${customer.brick_rates[location.id]}/brick`}
                                          size="small"
                                          color="success"
                                          variant="outlined"
                                          sx={{ mt: 0.5 }}
                                        />
                                      )}
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <ButtonGroup size="small">
                                    <IconButton
                                      onClick={() => handleOpenLocationDialog(customer, location)}
                                      color="primary"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      onClick={() => handleDeleteLocation(customer.id, location.id)}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ButtonGroup>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Alert severity="info">
                            No locations added yet. Add a location to set specific brick rates.
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Card>
        ))
      )}

      {/* Customer Dialog - Keep existing implementation but simplify styling */}
      <Dialog open={customerDialogOpen} onClose={handleCloseCustomerDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon color="primary" />
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </Box>
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
                label="Phone Number *"
                fullWidth
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                disabled={!!editingCustomer}
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
            
            <Grid item xs={12} md={6}>
              <TextField
                label="GSTIN"
                fullWidth
                value={customerForm.gstin}
                onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })}
                helperText="15-character GSTIN number"
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
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseCustomerDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomer} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog - Keep existing implementation but simplify styling */}
      <Dialog open={locationDialogOpen} onClose={handleCloseLocationDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocationIcon color="primary" />
            {editingLocation ? 'Edit Location' : `Add Location for ${selectedCustomer?.name}`}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Location Name *"
                fullWidth
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g., Main Office, Warehouse, etc."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Brick Rate (per piece)"
                type="number"
                fullWidth
                value={locationForm.brick_rate}
                onChange={(e) => setLocationForm({ ...locationForm, brick_rate: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Different rates for different locations"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Address *"
                fullWidth
                multiline
                rows={2}
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
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
                label="Contact Person"
                fullWidth
                value={locationForm.contact_person}
                onChange={(e) => setLocationForm({ ...locationForm, contact_person: e.target.value })}
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
                label="Contact Phone"
                fullWidth
                value={locationForm.contact_phone}
                onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value })}
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
                label="Pincode"
                fullWidth
                value={locationForm.pincode}
                onChange={(e) => setLocationForm({ ...locationForm, pincode: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={locationForm.state}
                  label="State"
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    const stateData = Object.entries(INDIAN_STATES).find(([code, data]) => code === selectedState);
                    setLocationForm({ 
                      ...locationForm, 
                      state: selectedState, 
                      state_code: stateData ? stateData[1].code : '24' 
                    });
                  }}
                >
                  {Object.entries(INDIAN_STATES).map(([code, state]) => (
                    <MenuItem key={code} value={code}>
                      {state.name} ({code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseLocationDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveLocation} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerManagement;