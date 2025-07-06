// components/sales/InvoiceGenerator.js - Fixed version
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Autocomplete,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  LocationOn as LocationOnIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Import the invoice viewer component
import GSTInvoiceViewer from './GSTInvoiceViewer';

const InvoiceGenerator = ({ open, onClose, customer, salesHistory }) => {
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    selectedSite: null,
    allSites: false, // Changed to false since we don't allow "all sites"
    gstBricks: '',
    nonGstBricks: '',
  });
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [gstInvoiceViewerOpen, setGstInvoiceViewerOpen] = useState(false);
  const [nonGstInvoiceViewerOpen, setNonGstInvoiceViewerOpen] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState(null);

  // Store customer data when dialog opens to prevent it from being lost
  useEffect(() => {
    if (open && customer) {
      setSelectedCustomer(customer);
      console.log('Storing customer data for invoice:', customer);
    }
  }, [open, customer]);

  // Get available sites for the customer
  const availableSites = useMemo(() => {
    if (!selectedCustomer || !salesHistory) {
      return [];
    }
    
    const sites = new Set();
    const customerSales = salesHistory.filter(sale => {
      const isMatch = sale.customer_name === selectedCustomer.name && 
                     sale.customer_phone === selectedCustomer.phone;
      
      if (isMatch && sale.location_name) {
        sites.add(sale.location_name);
      }
      
      return isMatch;
    });
    
    return Array.from(sites).map(site => ({ label: site, value: site }));
  }, [selectedCustomer, salesHistory]);

  // Calculate total bricks purchased by customer and actual rate
  const customerSalesData = useMemo(() => {
    if (!selectedCustomer || !salesHistory || !formData.fromDate || !formData.toDate || !formData.selectedSite) {
      return { totalBricks: 0, averageRate: 2.5, customerState: 'GJ', customerStateCode: '24' };
    }

    const filtered = salesHistory.filter(sale => {
      // Filter by customer
      const isCustomerMatch = sale.customer_name === selectedCustomer.name && 
                             sale.customer_phone === selectedCustomer.phone;
      
      // Filter by date range
      const saleDate = new Date(sale.date);
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      toDate.setHours(23, 59, 59, 999);
      const isDateInRange = saleDate >= fromDate && saleDate <= toDate;
      
      // Filter by specific site only (no "all sites" option)
      const isSiteMatch = formData.selectedSite && sale.location_name === formData.selectedSite.value;
      
      return isCustomerMatch && isDateInRange && isSiteMatch;
    });

    console.log('🔍 InvoiceGenerator Debug - Filtered Sales:', filtered);

    const totalBricks = filtered.reduce((total, sale) => total + parseInt(sale.quantity || 0), 0);
    
    // Calculate weighted average rate based on quantities
    let totalValue = 0;
    let totalQuantity = 0;
    
    // Get customer's actual state from sales data (use the most recent sale)
    let customerState = 'GJ'; // Default fallback
    let customerStateCode = '24'; // Default fallback
    
    if (filtered.length > 0) {
      // Use the most recent sale's state information
      const mostRecentSale = filtered.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      customerState = mostRecentSale.customer_state || 'GJ';
      customerStateCode = mostRecentSale.customer_state_code || '24';
      
      console.log('🔍 Most Recent Sale State Info:', {
        customerState,
        customerStateCode,
        saleData: mostRecentSale
      });
    }
    
    filtered.forEach(sale => {
      const quantity = parseInt(sale.quantity || 0);
      const rate = parseFloat(sale.price_per_brick || 0);
      totalValue += quantity * rate;
      totalQuantity += quantity;
    });
    
    const averageRate = totalQuantity > 0 ? totalValue / totalQuantity : 2.5;
    
    const result = { 
      totalBricks, 
      averageRate, 
      customerState, 
      customerStateCode 
    };
    
    console.log('🔍 InvoiceGenerator customerSalesData result:', result);
    
    return result;
  }, [selectedCustomer, salesHistory, formData]);

  const totalCustomerBricks = customerSalesData.totalBricks;
  const actualAverageRate = customerSalesData.averageRate;
  const actualCustomerState = customerSalesData.customerState;
  const actualCustomerStateCode = customerSalesData.customerStateCode;

  // Real-time validation function
  const validateBrickDistribution = useCallback(() => {
    const errors = {};
    const gstBricks = parseInt(formData.gstBricks) || 0;
    const nonGstBricks = parseInt(formData.nonGstBricks) || 0;
    const totalAllocated = gstBricks + nonGstBricks;

    // Check if site is selected
    if (!formData.selectedSite) {
      errors.site = 'Please select a specific site';
    }

    if (gstBricks < 0) {
      errors.gstBricks = 'GST bricks cannot be negative';
    }

    if (nonGstBricks < 0) {
      errors.nonGstBricks = 'Non-GST bricks cannot be negative';
    }

    if (totalAllocated > totalCustomerBricks && totalCustomerBricks > 0) {
      errors.total = `Total allocated bricks (${totalAllocated.toLocaleString()}) cannot exceed customer's total purchases (${totalCustomerBricks.toLocaleString()})`;
    }

    if (totalAllocated === 0 && formData.fromDate && formData.toDate && formData.selectedSite) {
      errors.total = 'Please specify at least some bricks for GST or Non-GST';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.gstBricks, formData.nonGstBricks, formData.selectedSite, totalCustomerBricks, formData.fromDate, formData.toDate]);

  // Run validation whenever relevant fields change
  useEffect(() => {
    validateBrickDistribution();
  }, [validateBrickDistribution]);

  const handleClose = () => {
    setFormData({
      fromDate: '',
      toDate: '',
      selectedSite: null,
      allSites: false, // Changed to false
      gstBricks: '',
      nonGstBricks: '',
    });
    setShowInvoice(false);
    setSelectedCustomer(null);
    setValidationErrors({});
    setGeneratedInvoiceData(null);
    setGstInvoiceViewerOpen(false);
    setNonGstInvoiceViewerOpen(false);
    onClose();
  };

  const handleSiteSelectionChange = (event, newValue) => {
    setFormData({
      ...formData,
      selectedSite: newValue,
      allSites: false, // Always false since we don't allow "all sites"
    });
  };

  const handleGenerateInvoice = () => {
    if (!validateBrickDistribution()) {
      return;
    }
    
    // Prepare invoice data
    const invoiceData = {
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      selectedSite: formData.selectedSite,
      allSites: false, // Always false now
      gstBricks: parseInt(formData.gstBricks) || 0,
      nonGstBricks: parseInt(formData.nonGstBricks) || 0,
      customerData: {
        ...selectedCustomer,
        actualState: actualCustomerState,
        actualStateCode: actualCustomerStateCode
      },
      totalCustomerBricks: totalCustomerBricks,
      actualRate: actualAverageRate
    };
    
    setGeneratedInvoiceData(invoiceData);
    console.log('Generating invoice with data:', invoiceData);
    setShowInvoice(true);
  };

  const handleOpenGSTInvoice = () => {
    setGstInvoiceViewerOpen(true);
  };

  const handleOpenNonGSTInvoice = () => {
    setNonGstInvoiceViewerOpen(true);
  };

  const handleCloseGSTInvoice = () => {
    setGstInvoiceViewerOpen(false);
  };

  const handleCloseNonGSTInvoice = () => {
    setNonGstInvoiceViewerOpen(false);
  };

  const handleBrickQuantityChange = (field, value) => {
    // Handle empty string - clear both fields or set other to total
    if (value === '') {
      if (totalCustomerBricks > 0) {
        const otherField = field === 'gstBricks' ? 'nonGstBricks' : 'gstBricks';
        setFormData(prev => ({
          ...prev,
          [field]: '',
          [otherField]: '' // Clear both when one is cleared
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
      return;
    }

    // Only allow positive integers
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    // Always auto-calculate the other field when typing
    if (totalCustomerBricks > 0) {
      const otherField = field === 'gstBricks' ? 'nonGstBricks' : 'gstBricks';
      const currentValue = parseInt(value || 0);
      const remaining = totalCustomerBricks - currentValue;
      
      // Update both fields - current field with typed value, other field with remaining
      setFormData(prev => ({
        ...prev,
        [field]: value,
        [otherField]: remaining >= 0 ? remaining.toString() : '0'
      }));
    } else {
      // If no total bricks yet, just update the current field
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // If showing invoice, render the invoice generation component
  if (showInvoice) {
    return (
      <>
        <Dialog 
          open={open} 
          onClose={handleClose}
          maxWidth="lg"
          fullWidth
          sx={{ zIndex: 1300 }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon color="primary" />
              Invoice Generated for {selectedCustomer?.name}
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box sx={{ p: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Successfully Generated!
                </Typography>
                <Typography variant="body2">
                  Two copies have been created:
                </Typography>
                <ul>
                  <li>GST Invoice: {formData.gstBricks} bricks with 12% GST</li>
                  <li>Non-GST Invoice: {formData.nonGstBricks} bricks without GST</li>
                </ul>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Customer: {selectedCustomer?.name} ({actualCustomerState})<br/>
                  Period: {formData.fromDate} to {formData.toDate}<br/>
                  Site: {formData.selectedSite?.label}
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleOpenGSTInvoice}
                  disabled={!generatedInvoiceData?.gstBricks || generatedInvoiceData.gstBricks === 0}
                >
                  View GST Invoice ({formData.gstBricks} bricks)
                </Button>
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={handleOpenNonGSTInvoice}
                  disabled={!generatedInvoiceData?.nonGstBricks || generatedInvoiceData.nonGstBricks === 0}
                >
                  View Non-GST Invoice ({formData.nonGstBricks} bricks)
                </Button>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowInvoice(false)}>
              Back to Form
            </Button>
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* GST Invoice Viewer - Higher z-index */}
        {generatedInvoiceData && (
          <GSTInvoiceViewer
            open={gstInvoiceViewerOpen}
            onClose={handleCloseGSTInvoice}
            customerData={generatedInvoiceData.customerData}
            invoiceData={generatedInvoiceData}
            brickQuantity={generatedInvoiceData.gstBricks}
            pricePerBrick={generatedInvoiceData.actualRate} // Use actual calculated rate
            isGSTInvoice={true}
          />
        )}

        {/* Non-GST Invoice Viewer - Higher z-index */}
        {generatedInvoiceData && (
          <GSTInvoiceViewer
            open={nonGstInvoiceViewerOpen}
            onClose={handleCloseNonGSTInvoice}
            customerData={generatedInvoiceData.customerData}
            invoiceData={generatedInvoiceData}
            brickQuantity={generatedInvoiceData.nonGstBricks}
            pricePerBrick={generatedInvoiceData.actualRate} // Use actual calculated rate
            isGSTInvoice={false}
          />
        )}
      </>
    );
  }

  // Form to collect inputs
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1300 }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          Generate GST/Non-GST Invoice for {selectedCustomer?.name || 'Customer'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Invoice Parameters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the date range, specific site, and brick distribution for generating GST and Non-GST invoices
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="From Date"
              type="date"
              value={formData.fromDate}
              onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DateRangeIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="To Date"
              type="date"
              value={formData.toDate}
              onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DateRangeIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              options={availableSites}
              value={formData.selectedSite}
              onChange={handleSiteSelectionChange}
              disabled={availableSites.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Site *"
                  required
                  error={!!validationErrors.site}
                  helperText={
                    validationErrors.site || 
                    (availableSites.length === 0 
                      ? 'No sites available for this customer. Please check date range.' 
                      : 'Select a specific site for invoice generation')
                  }
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option?.value === value?.value}
            />
          </Grid>

          {/* No sites available warning */}
          {formData.fromDate && formData.toDate && availableSites.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  No purchase sites found for this customer in the selected date range. 
                  Please check the date range or verify that the customer has made purchases during this period.
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Customer Brick Summary */}
          {formData.fromDate && formData.toDate && formData.selectedSite && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'info.50', 
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'info.200'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Customer Purchase Summary:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer: {selectedCustomer?.name} ({selectedCustomer?.phone})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  State: {actualCustomerState} ({actualCustomerStateCode})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Period: {formData.fromDate} to {formData.toDate}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Site: {formData.selectedSite?.label || 'Not selected'}
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Total Bricks Purchased at this Site: {totalCustomerBricks.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  Average Rate: ₹{actualAverageRate.toFixed(2)} per brick
                </Typography>
              </Box>
            </Grid>
          )}

          <Divider sx={{ width: '100%', my: 2 }} />

          {/* Brick Distribution Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              Brick Distribution for Invoice
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Specify how many bricks should be included in GST vs Non-GST invoices
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Bricks for GST Invoice"
              type="number"
              value={formData.gstBricks}
              onChange={(e) => handleBrickQuantityChange('gstBricks', e.target.value)}
              fullWidth
              inputProps={{ min: 0, max: totalCustomerBricks }}
              error={!!validationErrors.gstBricks}
              helperText={validationErrors.gstBricks || 'Bricks to include in GST calculation (12% tax)'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Bricks for Non-GST Invoice"
              type="number"
              value={formData.nonGstBricks}
              onChange={(e) => handleBrickQuantityChange('nonGstBricks', e.target.value)}
              fullWidth
              inputProps={{ min: 0, max: totalCustomerBricks }}
              error={!!validationErrors.nonGstBricks}
              helperText={validationErrors.nonGstBricks || 'Bricks to exclude from GST (no tax)'}
            />
          </Grid>

          {/* Validation Errors */}
          {validationErrors.total && (
            <Grid item xs={12}>
              <Alert severity="error">
                {validationErrors.total}
              </Alert>
            </Grid>
          )}

          {/* Summary */}
          {(formData.gstBricks || formData.nonGstBricks) && totalCustomerBricks > 0 && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'primary.50', 
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'primary.200'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Invoice Summary:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  GST Invoice: {(parseInt(formData.gstBricks) || 0).toLocaleString()} bricks (with 12% GST)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Non-GST Invoice: {(parseInt(formData.nonGstBricks) || 0).toLocaleString()} bricks (without GST)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rate per brick: ₹{actualAverageRate.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {((parseInt(formData.gstBricks) || 0) + (parseInt(formData.nonGstBricks) || 0)).toLocaleString()} of {totalCustomerBricks.toLocaleString()} bricks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remaining: {(totalCustomerBricks - ((parseInt(formData.gstBricks) || 0) + (parseInt(formData.nonGstBricks) || 0))).toLocaleString()} bricks
                </Typography>
                {/* Estimated amounts */}
                {(parseInt(formData.gstBricks) || 0) > 0 && (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                    GST Invoice Amount: ₹{((parseInt(formData.gstBricks) || 0) * actualAverageRate * 1.12).toFixed(2)} (with 12% GST)
                  </Typography>
                )}
                {(parseInt(formData.nonGstBricks) || 0) > 0 && (
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
                    Non-GST Invoice Amount: ₹{((parseInt(formData.nonGstBricks) || 0) * actualAverageRate).toFixed(2)} (without GST)
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleGenerateInvoice}
          variant="contained"
          disabled={!formData.fromDate || !formData.toDate || !formData.selectedSite || Object.keys(validationErrors).length > 0}
        >
          Generate Invoices
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceGenerator;