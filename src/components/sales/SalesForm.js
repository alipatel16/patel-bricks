import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import {
  ShoppingCart as SalesIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CurrencyRupee as CurrencyIcon,
  Inventory as InventoryIcon,
  Discount as DiscountIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Calculate as CalculateIcon,
  Home as AddressIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useSales } from '../hooks/useSales';
import { useInventory } from '../hooks/useInventory';
import LoadingSpinner from './common/LoadingSpinner';
import CustomerInfo from './sales/CustomerInfo';
import { INDIAN_STATES, PAYMENT_METHODS, VALIDATION_RULES, HSN_CODES } from '../utils/constants';
import toast from 'react-hot-toast';

const SalesForm = ({ onSaleComplete = () => {} }) => {
  const { recordSale, loadCustomers } = useSales();
  const { inventory } = useInventory();
  
  const [saleForm, setSaleForm] = useState({
    quantity: '',
    pricePerBrick: '6.15',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerState: 'GJ', // Default to Gujarat
    customerStateCode: '24', // Default to Gujarat state code
    customerGSTIN: '',
    discount: '',
    discountType: 'amount',
    paymentMethod: 'cash',
    notes: '',
  });
  
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    total: 0,
  });
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadCustomerData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [saleForm.quantity, saleForm.pricePerBrick, saleForm.discount, saleForm.discountType, saleForm.customerState]);

  useEffect(() => {
    if (selectedCustomer && useExistingCustomer) {
      setSaleForm(prev => ({
        ...prev,
        customerName: selectedCustomer.name || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: selectedCustomer.email || '',
        customerAddress: selectedCustomer.address || '',
        customerState: selectedCustomer.state || 'GJ',
        customerStateCode: selectedCustomer.stateCode || '24',
        customerGSTIN: selectedCustomer.gstin || '',
      }));
    }
  }, [selectedCustomer, useExistingCustomer]);

  // Update state code when state changes
  useEffect(() => {
    const stateInfo = Object.entries(INDIAN_STATES).find(([key, value]) => key === saleForm.customerState);
    if (stateInfo) {
      setSaleForm(prev => ({ ...prev, customerStateCode: stateInfo[1].code }));
    }
  }, [saleForm.customerState]);

  const loadCustomerData = async () => {
    try {
      const result = await loadCustomers();
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const calculateTotals = () => {
    const quantity = parseFloat(saleForm.quantity) || 0;
    const pricePerBrick = parseFloat(saleForm.pricePerBrick) || 0;
    const discount = parseFloat(saleForm.discount) || 0;

    const subtotal = quantity * pricePerBrick;
    const discountAmount = saleForm.discountType === 'percentage' 
      ? (subtotal * discount) / 100 
      : discount;
    
    const taxableAmount = subtotal - discountAmount;
    
    // Determine if inter-state (for IGST vs CGST+SGST)
    const isInterState = saleForm.customerState !== 'GJ'; // Assuming company is in Gujarat
    
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    
    if (isInterState) {
      igstAmount = (taxableAmount * 12) / 100; // 12% IGST
    } else {
      cgstAmount = (taxableAmount * 6) / 100; // 6% CGST
      sgstAmount = (taxableAmount * 6) / 100; // 6% SGST
    }
    
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const total = taxableAmount + totalTax;

    setCalculations({
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      total,
    });
  };

  const validateForm = () => {
    const errors = {};

    // Quantity validation
    if (!saleForm.quantity || parseFloat(saleForm.quantity) <= 0) {
      errors.quantity = 'Quantity is required and must be greater than 0';
    } else if (parseFloat(saleForm.quantity) > (inventory.bricks?.total_stock || 0)) {
      errors.quantity = 'Insufficient stock available';
    }

    // Price validation
    if (!saleForm.pricePerBrick || parseFloat(saleForm.pricePerBrick) <= 0) {
      errors.pricePerBrick = 'Price per brick is required and must be greater than 0';
    }

    // Customer name validation
    if (!saleForm.customerName.trim()) {
      errors.customerName = 'Customer name is required';
    }

    // Phone validation
    if (!saleForm.customerPhone.trim()) {
      errors.customerPhone = 'Phone number is required';
    } else if (!VALIDATION_RULES.PHONE_REGEX.test(saleForm.customerPhone)) {
      errors.customerPhone = 'Please enter a valid phone number';
    }

    // Email validation (optional)
    if (saleForm.customerEmail && !VALIDATION_RULES.EMAIL_REGEX.test(saleForm.customerEmail)) {
      errors.customerEmail = 'Please enter a valid email address';
    }

    // Address validation
    if (!saleForm.customerAddress.trim()) {
      errors.customerAddress = 'Customer address is required';
    }

    // GSTIN validation (optional but if provided should be valid)
    if (saleForm.customerGSTIN && !VALIDATION_RULES.GSTIN_REGEX.test(saleForm.customerGSTIN)) {
      errors.customerGSTIN = 'Please enter a valid GSTIN (15 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    
    try {
      const saleData = {
        quantity: parseFloat(saleForm.quantity),
        pricePerBrick: parseFloat(saleForm.pricePerBrick),
        customerName: saleForm.customerName.trim(),
        customerPhone: saleForm.customerPhone.trim(),
        customerEmail: saleForm.customerEmail.trim(),
        customerAddress: saleForm.customerAddress.trim(),
        customerState: saleForm.customerState,
        customerStateCode: saleForm.customerStateCode,
        customerGSTIN: saleForm.customerGSTIN.trim(),
        discount: parseFloat(saleForm.discount) || 0,
        discountType: saleForm.discountType,
        paymentMethod: saleForm.paymentMethod,
        notes: saleForm.notes.trim(),
        hsnCode: HSN_CODES.FLY_ASH_BRICKS, // Static HSN code for fly ash bricks
      };

      const result = await recordSale(saleData);
      
      if (result.success) {
        toast.success('Sale recorded successfully!');
        resetForm();
        onSaleComplete(result.data);
      } else {
        toast.error(result.error || 'Failed to record sale');
      }
    } catch (error) {
      console.error('Error submitting sale:', error);
      toast.error('Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSaleForm({
      quantity: '',
      pricePerBrick: '6.15',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerState: 'GJ',
      customerStateCode: '24',
      customerGSTIN: '',
      discount: '',
      discountType: 'amount',
      paymentMethod: 'cash',
      notes: '',
    });
    setValidationErrors({});
    setSelectedCustomer(null);
    setUseExistingCustomer(false);
  };

  if (loading) {
    return <LoadingSpinner message="Recording sale..." />;
  }

  return (
    <Box>
      <Card elevation={2}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SalesIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              Record Sale
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Product Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <InventoryIcon sx={{ mr: 1 }} />
                  Product Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  required
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                  error={!!validationErrors.quantity}
                  helperText={validationErrors.quantity || `Available: ${inventory.bricks?.total_stock?.toLocaleString() || 0} bricks`}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">bricks</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Price per Brick"
                  type="number"
                  step="0.01"
                  fullWidth
                  required
                  value={saleForm.pricePerBrick}
                  onChange={(e) => setSaleForm({ ...saleForm, pricePerBrick: e.target.value })}
                  error={!!validationErrors.pricePerBrick}
                  helperText={validationErrors.pricePerBrick}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="HSN Code"
                  fullWidth
                  value={HSN_CODES.FLY_ASH_BRICKS}
                  disabled
                  helperText="HSN Code is static for fly ash bricks"
                />
              </Grid>

              <Divider sx={{ width: '100%', my: 2 }} />

              {/* Customer Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Customer Information
                </Typography>
              </Grid>

              {/* Existing Customer Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useExistingCustomer}
                      onChange={(e) => setUseExistingCustomer(e.target.checked)}
                    />
                  }
                  label="Use existing customer"
                />
              </Grid>

              {useExistingCustomer && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.name} - ${option.phone}`}
                    value={selectedCustomer}
                    onChange={(event, newValue) => setSelectedCustomer(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer"
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  label="Customer Name"
                  fullWidth
                  required
                  value={saleForm.customerName}
                  onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                  error={!!validationErrors.customerName}
                  helperText={validationErrors.customerName}
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
                  required
                  value={saleForm.customerPhone}
                  onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                  error={!!validationErrors.customerPhone}
                  helperText={validationErrors.customerPhone}
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
                  label="Email (Optional)"
                  type="email"
                  fullWidth
                  value={saleForm.customerEmail}
                  onChange={(e) => setSaleForm({ ...saleForm, customerEmail: e.target.value })}
                  error={!!validationErrors.customerEmail}
                  helperText={validationErrors.customerEmail}
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
                  label="GSTIN (Optional)"
                  fullWidth
                  value={saleForm.customerGSTIN}
                  onChange={(e) => setSaleForm({ ...saleForm, customerGSTIN: e.target.value.toUpperCase() })}
                  error={!!validationErrors.customerGSTIN}
                  helperText={validationErrors.customerGSTIN || "15-character GSTIN number"}
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
                  label="Customer Address"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  value={saleForm.customerAddress}
                  onChange={(e) => setSaleForm({ ...saleForm, customerAddress: e.target.value })}
                  error={!!validationErrors.customerAddress}
                  helperText={validationErrors.customerAddress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AddressIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={saleForm.customerState}
                    onChange={(e) => setSaleForm({ ...saleForm, customerState: e.target.value })}
                    label="State"
                  >
                    {Object.entries(INDIAN_STATES).map(([key, value]) => (
                      <MenuItem key={key} value={key}>
                        {value.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="State Code"
                  fullWidth
                  value={saleForm.customerStateCode}
                  disabled
                  helperText="Auto-filled based on selected state"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Divider sx={{ width: '100%', my: 2 }} />

              {/* Payment and Discount Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CurrencyIcon sx={{ mr: 1 }} />
                  Payment Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Discount"
                  type="number"
                  fullWidth
                  value={saleForm.discount}
                  onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DiscountIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {saleForm.discountType === 'percentage' ? '%' : '$'}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={saleForm.discountType}
                    onChange={(e) => setSaleForm({ ...saleForm, discountType: e.target.value })}
                    label="Discount Type"
                  >
                    <MenuItem value="amount">Fixed Amount</MenuItem>
                    <MenuItem value="percentage">Percentage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={saleForm.paymentMethod}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                    label="Payment Method"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                      <MenuItem key={key} value={key}>
                        {value.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes (Optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  placeholder="Additional notes about this sale..."
                />
              </Grid>

              <Divider sx={{ width: '100%', my: 2 }} />

              {/* Calculations Summary */}
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalculateIcon sx={{ mr: 1 }} />
                    Amount Breakdown
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Subtotal</Typography>
                      <Typography variant="h6">${calculations.subtotal.toFixed(2)}</Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Discount</Typography>
                      <Typography variant="h6" color="error.main">-${calculations.discountAmount.toFixed(2)}</Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Tax (GST)</Typography>
                      <Typography variant="h6">${calculations.totalTax.toFixed(2)}</Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        ${calculations.total.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* GST Breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>GST Breakdown:</Typography>
                    <Grid container spacing={1}>
                      {calculations.cgstAmount > 0 && (
                        <Grid item xs={4}>
                          <Chip size="small" label={`CGST (6%): ₹₹{calculations.cgstAmount.toFixed(2)}`} />
                        </Grid>
                      )}
                      {calculations.sgstAmount > 0 && (
                        <Grid item xs={4}>
                          <Chip size="small" label={`SGST (6%): ₹₹{calculations.sgstAmount.toFixed(2)}`} />
                        </Grid>
                      )}
                      {calculations.igstAmount > 0 && (
                        <Grid item xs={4}>
                          <Chip size="small" label={`IGST (12%): ₹₹{calculations.igstAmount.toFixed(2)}`} />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Paper>
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={<SaveIcon />}
                  >
                    {loading ? 'Recording Sale...' : 'Record Sale'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SalesForm;