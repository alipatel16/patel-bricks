import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  TablePagination,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSales } from '../hooks/useSales';
import { PAYMENT_METHODS } from '../utils/constants';
import LoadingSpinner from './common/LoadingSpinner';
import GSTInvoiceViewer from './sales/GSTInvoiceViewer';
import toast from 'react-hot-toast';

const SalesList = () => {
  const { sales, loading, error, loadSales } = useSales();
  
  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for dialogs
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    try {
      await loadSales();
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Error loading sales data');
    }
  };

  // Get filtered data
  const getFilteredData = () => {
    let filtered = [...sales];

    // Text search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.customer_name?.toLowerCase().includes(searchLower) ||
        sale.customer_phone?.includes(searchTerm) ||
        sale.customer_email?.toLowerCase().includes(searchLower) ||
        sale.invoice_number?.toLowerCase().includes(searchLower) ||
        sale.notes?.toLowerCase().includes(searchLower) ||
        sale.customer_address?.toLowerCase().includes(searchLower)
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= today;
        });
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= monthAgo;
        });
        break;
      default:
        break;
    }

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === paymentFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    return filtered;
  };

  const filteredData = getFilteredData();
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle view details
  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    setDetailsDialogOpen(true);
  };

  // Handle view invoice
  const handleViewInvoice = (sale) => {
    setSelectedSale(sale);
    setInvoiceViewerOpen(true);
  };

  // Handle close details dialog
  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedSale(null);
  };

  // Handle close invoice viewer
  const handleCloseInvoiceViewer = () => {
    setInvoiceViewerOpen(false);
    setSelectedSale(null);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setPaymentFilter('all');
    setPage(0);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvHeaders = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Address',
      'State',
      'GSTIN',
      'Quantity',
      'Price per Brick',
      'Discount',
      'Tax Amount',
      'Total Amount',
      'Payment Method',
      'Notes',
    ];

    const csvData = filteredData.map(sale => [
      sale.invoice_number || sale.id || '',
      sale.date || '',
      sale.customer_name || '',
      sale.customer_phone || '',
      sale.customer_email || '',
      sale.customer_address || '',
      sale.customer_state || '',
      sale.customer_gstin || '',
      sale.quantity || 0,
      sale.price_per_brick || 0,
      sale.discount_amount || 0,
      sale.total_tax || 0,
      sale.total_amount || 0,
      sale.payment_method || '',
      sale.notes || '',
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales data exported successfully');
  };

  if (loading) {
    return <LoadingSpinner message="Loading sales history..." />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading sales data: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sales History
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Box>

          {/* Search and Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by customer name, phone, email, or invoice"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')} size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Date Filter</InputLabel>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  label="Date Filter"
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>{value.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<FilterIcon />}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Results Summary */}
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Showing {paginatedData.length} of {filteredData.length} sales
          </Typography>

          {/* Sales Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No sales found matching your criteria
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((sale) => (
                    <TableRow key={sale.id || sale.invoice_number} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {sale.invoice_number || sale.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(sale.date), 'dd MMM yyyy')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(sale.timestamp || sale.date), 'HH:mm')}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {sale.customer_name || 'N/A'}
                          </Typography>
                          {sale.customer_phone && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {sale.customer_phone}
                            </Typography>
                          )}
                          {sale.customer_address && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {sale.customer_address.length > 30 ? `${sale.customer_address.substring(0, 30)}...` : sale.customer_address}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {formatNumber(sale.quantity)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          bricks
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(sale.price_per_brick)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {formatCurrency(sale.total_amount)}
                        </Typography>
                        {sale.discount_amount > 0 && (
                          <Typography variant="caption" color="error">
                            (Disc: {formatCurrency(sale.discount_amount)})
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}
                          size="small"
                          color={sale.payment_method === 'cash' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View details">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDetails(sale)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View invoice">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewInvoice(sale)}
                              color="primary"
                            >
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Sale Details</DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Invoice Information</Typography>
                <Typography><strong>Invoice Number:</strong> {selectedSale.invoice_number}</Typography>
                <Typography><strong>Date:</strong> {format(new Date(selectedSale.date), 'dd MMM yyyy, HH:mm')}</Typography>
                <Typography><strong>HSN Code:</strong> {selectedSale.hsn_code || '6815'}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
                <Typography><strong>Name:</strong> {selectedSale.customer_name}</Typography>
                <Typography><strong>Phone:</strong> {selectedSale.customer_phone}</Typography>
                {selectedSale.customer_email && (
                  <Typography><strong>Email:</strong> {selectedSale.customer_email}</Typography>
                )}
                <Typography><strong>Address:</strong> {selectedSale.customer_address}</Typography>
                <Typography><strong>State:</strong> {selectedSale.customer_state} ({selectedSale.customer_state_code})</Typography>
                {selectedSale.customer_gstin && (
                  <Typography><strong>GSTIN:</strong> {selectedSale.customer_gstin}</Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Product Details</Typography>
                <Typography><strong>Quantity:</strong> {formatNumber(selectedSale.quantity)} bricks</Typography>
                <Typography><strong>Rate:</strong> {formatCurrency(selectedSale.price_per_brick)} per brick</Typography>
                <Typography><strong>Payment Method:</strong> {PAYMENT_METHODS[selectedSale.payment_method]?.label}</Typography>
                {selectedSale.notes && (
                  <Typography><strong>Notes:</strong> {selectedSale.notes}</Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Amount Breakdown</Typography>
                <Typography>Subtotal: {formatCurrency(selectedSale.quantity * selectedSale.price_per_brick)}</Typography>
                <Typography>Discount: {formatCurrency(selectedSale.discount_amount || 0)}</Typography>
                <Typography>Tax (GST): {formatCurrency(selectedSale.total_tax || 0)}</Typography>
                <Typography><strong>Total Amount: {formatCurrency(selectedSale.total_amount || 0)}</strong></Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              handleCloseDetails();
              handleViewInvoice(selectedSale);
            }}
            startIcon={<ReceiptIcon />}
          >
            View Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* GST Invoice Viewer */}
      <GSTInvoiceViewer
        open={invoiceViewerOpen}
        onClose={handleCloseInvoiceViewer}
        saleData={selectedSale}
      />
    </Box>
  );
};

export default SalesList;