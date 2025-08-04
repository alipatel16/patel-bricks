// components/sales/StatementGenerator.js
import React, { useState, useMemo, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  LocationOn as LocationOnIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const StatementGenerator = ({ open, onClose, customer, salesHistory }) => {
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    selectedSite: null,
    allSites: true,
  });
  const [showStatement, setShowStatement] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Store customer data when dialog opens to prevent it from being lost
  useEffect(() => {
    if (open && customer) {
      setSelectedCustomer(customer);
      
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

  // Filter sales data based on form inputs
  const filteredSales = useMemo(() => {
    if (!selectedCustomer || !salesHistory || !formData.fromDate || !formData.toDate) return [];

    const filtered = salesHistory.filter(sale => {
      // Filter by customer
      const isCustomerMatch = sale.customer_name === selectedCustomer.name && 
                             sale.customer_phone === selectedCustomer.phone;
      
      // Filter by date range
      const saleDate = new Date(sale.date);
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      toDate.setHours(23, 59, 59, 999); // Include end date
      const isDateInRange = saleDate >= fromDate && saleDate <= toDate;
      
      // Filter by site
      const isSiteMatch = formData.allSites || 
                         (formData.selectedSite && sale.location_name === formData.selectedSite.value);
      
      return isCustomerMatch && isDateInRange && isSiteMatch;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    
    return filtered;
  }, [selectedCustomer, salesHistory, formData]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalQuantity = filteredSales.reduce((sum, sale) => sum + parseInt(sale.quantity || 0), 0);
    
    // Calculate total amount correctly based on GST inclusion
    const totalAmount = filteredSales.reduce((sum, sale) => {
      const quantity = parseInt(sale.quantity || 0);
      const pricePerBrick = parseFloat(sale.price_per_brick || 0);
      const discountAmount = parseFloat(sale.discount_amount || 0);
      
      // Check if GST was included
      const gstIncluded = sale.include_gst || sale.gst_included || sale.includeGST || false;
      
      if (gstIncluded) {
        return sum + parseFloat(sale.total_amount || 0);
      } else {
        const subtotal = quantity * pricePerBrick;
        const amountAfterDiscount = subtotal - discountAmount;
        return sum + amountAfterDiscount;
      }
    }, 0);
    
    return {
      quantity: totalQuantity,
      amount: totalAmount
    };
  }, [filteredSales]);

  // NEW: Calculate site-wise totals
  const siteWiseTotals = useMemo(() => {
    const siteData = {};
    
    filteredSales.forEach(sale => {
      const siteName = sale.location_name || 'Unknown Site';
      const quantity = parseInt(sale.quantity || 0);
      
      if (!siteData[siteName]) {
        siteData[siteName] = 0;
      }
      siteData[siteName] += quantity;
    });
    
    return Object.entries(siteData).map(([site, quantity]) => ({
      site,
      quantity
    })).sort((a, b) => a.site.localeCompare(b.site));
  }, [filteredSales]);

  const handleClose = () => {
    setFormData({
      fromDate: '',
      toDate: '',
      selectedSite: null,
      allSites: true,
    });
    setShowStatement(false);
    setSelectedCustomer(null);
    onClose();
  };

  const handleSiteSelectionChange = (event, newValue) => {
    
    setFormData({
      ...formData,
      selectedSite: newValue,
      allSites: newValue === null || newValue?.value === 'all',
    });
  };

  const handleGenerateStatement = () => {
    
    
    setShowStatement(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const statementContent = document.getElementById('statement-content').outerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Statement - ${selectedCustomer?.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
            }
            
            .statement-container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 10mm;
            }
            
            .company-header {
              text-align: center;
              border: 2px solid black;
              padding: 15px;
              margin-bottom: 20px;
            }
            
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
              letter-spacing: 2px;
            }
            
            .company-subtitle {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .company-address {
              font-size: 12px;
            }
            
            .customer-info {
              border: 1px solid black;
              padding: 12px;
              margin-bottom: 15px;
            }
            
            .customer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .customer-left {
              flex: 1;
            }
            
            .customer-right {
              text-align: right;
            }
            
            .customer-name {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 14px;
            }
            
            .customer-address {
              font-size: 12px;
            }
            
            .date-info {
              font-weight: bold;
              font-size: 12px;
            }
            
            table { 
              border-collapse: collapse; 
              width: 100%; 
              border: 1px solid black;
              margin-bottom: 20px;
            }
            
            td, th { 
              border: 1px solid black; 
              padding: 6px 8px; 
              text-align: center;
              font-size: 11px;
            }
            
            th {
              font-weight: bold;
              background-color: white;
            }
            
            .total-row {
              font-weight: bold;
              background-color: #f5f5f5;
            }
            
            .sr-no-col { width: 6%; }
            .date-col { width: 10%; }
            .vehicle-col { width: 12%; }
            .doc-col { width: 10%; }
            .site-col { width: 12%; }
            .quantity-col { width: 12%; }
            .rate-col { width: 10%; }
            .amount-col { width: 12%; }
            
            @media print { 
              body { margin: 0; padding: 10mm; }
              .statement-container { padding: 0; }
              .no-print { display: none !important; }
              .print-button { display: none !important; }
              button { display: none !important; }
              .MuiButton-root { display: none !important; }
              .MuiIconButton-root { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="statement-container">
            ${statementContent}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '';
    return parseFloat(amount).toFixed(2);
  };

  // Check if GST was included in the sale and calculate correct amount
  const getCorrectAmount = (sale) => {
    const quantity = parseInt(sale.quantity || 0);
    const pricePerBrick = parseFloat(sale.price_per_brick || 0);
    const discountAmount = parseFloat(sale.discount_amount || 0);
    
    // Check if GST was included (multiple field names for compatibility)
    const gstIncluded = sale.include_gst || sale.gst_included || sale.includeGST || false;
    
    if (gstIncluded) {
      // If GST was included, use the stored total_amount
      return formatCurrency(sale.total_amount);
    } else {
      // If GST was not included, calculate amount without GST
      const subtotal = quantity * pricePerBrick;
      const amountAfterDiscount = subtotal - discountAmount;
      return formatCurrency(amountAfterDiscount);
    }
  };

  const formatRate = (sale) => {
    // Use the actual price per brick from the sale record (same as SalesHistory)
    return formatCurrency(sale.price_per_brick);
  };

  if (showStatement) {
    return (
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon color="primary" />
              Customer Statement - {selectedCustomer?.name}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                size="small"
                className="print-button"
              >
                Print
              </Button>
              <IconButton onClick={handleClose} size="small" className="no-print">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box id="statement-content" sx={{ bgcolor: 'white', p: 2 }}>
            {/* Enhanced Company Header */}
            <Box className="company-header" sx={{ textAlign: 'center', mb: 3, border: '2px solid black', p: 2 }}>
              <Typography className="company-name" variant="h4" sx={{ fontWeight: 'bold', fontSize: '28px', letterSpacing: 2 }}>
                PATEL BRICKS
              </Typography>
              <Typography className="company-subtitle" variant="body1" sx={{ fontWeight: 'bold', mt: 1, fontSize: '16px' }}>
                Manufacturer of fly ash Bricks
              </Typography>
              <Typography className="company-address" variant="body2" sx={{ mt: 0.5, fontSize: '14px' }}>
                Bhojva, Viramgam-382150, MO:9898032192,8000001819
              </Typography>
            </Box>

            {/* Enhanced Customer Information Section */}
            <Box className="customer-info" sx={{ mb: 2, border: '1px solid black', p: 1.5 }}>
              <Box className="customer-row" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box className="customer-left" sx={{ flex: 1 }}>
                  <Typography className="customer-name" variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '14px' }}>
                    NAME OF CUSTOMER : {selectedCustomer?.name?.toUpperCase()}
                  </Typography>
                  <Typography className="customer-address" variant="body1" sx={{ fontSize: '12px' }}>
                    MOBILE: {selectedCustomer?.phone}
                    {formData.selectedSite && !formData.allSites && ` - ${formData.selectedSite.value}`}
                  </Typography>
                </Box>
                <Box className="customer-right" sx={{ textAlign: 'right' }}>
                  <Typography className="date-info" variant="body1" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
                    DATE AS ON : {formatDateForDisplay(formData.toDate)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Enhanced Statement Table */}
            <TableContainer sx={{ border: '1px solid black' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell className="sr-no-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '6%', p: 1 }}>
                      SR NO
                    </TableCell>
                    <TableCell className="date-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>
                      DATE
                    </TableCell>
                    <TableCell className="vehicle-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '12%' }}>
                      VEHICLE NO
                    </TableCell>
                    <TableCell className="doc-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>
                      DOC NO
                    </TableCell>
                    {/* NEW: Site Name Column */}
                    <TableCell className="site-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '12%' }}>
                      SITE NAME
                    </TableCell>
                    <TableCell className="quantity-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '12%' }}>
                      QUANTITY
                    </TableCell>
                    <TableCell className="rate-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '10%' }}>
                      RATE
                    </TableCell>
                    <TableCell className="amount-col" sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', width: '12%' }}>
                      AMOUNT
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Data rows */}
                  {filteredSales.map((sale, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', p: 1, fontSize: '11px' }}>
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {formatDateForDisplay(sale.date)}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {sale.vehicle_number || ''}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {sale.challan_number || sale.id || ''}
                      </TableCell>
                      {/* NEW: Site Name Cell */}
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {sale.location_name || ''}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {sale.quantity}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {formatRate(sale)}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontSize: '11px' }}>
                        {getCorrectAmount(sale)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total row */}
                  {filteredSales.length > 0 && (
                    <TableRow className="total-row">
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center', p: 1, fontSize: '11px', fontWeight: 'bold' }}>
                        
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                      <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                      <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', fontSize: '11px' }}>
                        TOTAL
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                      <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', fontSize: '11px' }}>
                        {totals.quantity}
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                      <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', fontSize: '11px' }}>
                        {formatCurrency(totals.amount)}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* NEW: Site-wise breakdown rows inside table */}
                  {filteredSales.length > 0 && siteWiseTotals.length > 1 && (
                    <>
                      {/* Site breakdown header row */}
                      
                      {/* Site breakdown data rows */}
                      {siteWiseTotals.map((siteTotal, index) => (
                        <TableRow key={`site-${index}`}>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                          <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', fontSize: '11px' }}>
                            {siteTotal.site}
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                          <TableCell sx={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', fontSize: '11px' }}>
                            {siteTotal.quantity}
                          </TableCell>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                          <TableCell sx={{ border: '1px solid black', fontSize: '11px' }}></TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Empty rows to fill the page */}
                  {Array.from({ 
                    length: Math.max(0, 25 - filteredSales.length - (filteredSales.length > 0 ? 1 : 0) - (siteWiseTotals.length > 1 ? siteWiseTotals.length + 1 : 0)) 
                  }).map((_, index) => {
                    const rowNumber = filteredSales.length + (filteredSales.length > 0 ? 2 : 1) + (siteWiseTotals.length > 1 ? siteWiseTotals.length + 1 : 0) + index;
                    return (
                      <TableRow key={`empty-${index}`}>
                        <TableCell sx={{ border: '1px solid black', textAlign: 'center', height: 25, p: 1, fontSize: '11px' }}>
                          {rowNumber}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                        <TableCell sx={{ border: '1px solid black', height: 25, fontSize: '11px' }}></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>

        <DialogActions className="no-print">
          <Button onClick={() => setShowStatement(false)}>
            Back to Form
          </Button>
          <Button onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Form to collect inputs
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          Generate Statement for {selectedCustomer?.name || 'Customer'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Statement Parameters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the date range and site(s) for generating the customer statement
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
              options={[{ label: 'All Sites', value: 'all' }, ...availableSites]}
              value={formData.allSites ? { label: 'All Sites', value: 'all' } : formData.selectedSite}
              onChange={handleSiteSelectionChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Site"
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

          {/* Preview Information */}
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
                Statement Preview:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer: {selectedCustomer?.name} ({selectedCustomer?.phone})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Period: {formData.fromDate || 'Not selected'} to {formData.toDate || 'Not selected'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Site(s): {formData.allSites ? 'All Sites' : formData.selectedSite?.label || 'Not selected'}
              </Typography>
              {formData.fromDate && formData.toDate && (
                <>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Found {filteredSales.length} transaction(s) matching criteria
                  </Typography>
                  {filteredSales.length > 0 && (
                    <Typography variant="body2" color="info.main" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                      Total: {totals.quantity} bricks, ₹{formatCurrency(totals.amount)}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleGenerateStatement}
          variant="contained"
          disabled={!formData.fromDate || !formData.toDate}
        >
          Generate Statement
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatementGenerator;