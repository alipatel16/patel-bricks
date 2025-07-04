import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

// Import services
import { salesService } from '../../services/salesService';

// Import contexts
import { useApp } from '../../context/AppContext';

function SalesHistory() {
  const { actions: appActions } = useApp();

  // State management
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Bill generation
  const [billDialog, setBillDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Load sales history
  useEffect(() => {
    loadSalesHistory();
  }, []);

  // Filter data when search or filters change
  useEffect(() => {
    filterSalesData();
  }, [salesData, searchTerm, filterBy, dateRange]);

  const loadSalesHistory = async () => {
    try {
      setLoading(true);
      const result = await salesService.getSalesHistory(1000);
      
      if (result.success) {
        setSalesData(result.data);
      } else {
        appActions.showNotification('Failed to load sales history', 'error');
      }
    } catch (error) {
      console.error('Error loading sales history:', error);
      appActions.showNotification('Error loading sales history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterSalesData = () => {
    let filtered = [...salesData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sale => {
        const searchLower = searchTerm.toLowerCase();
        return (
          sale.customer_name?.toLowerCase().includes(searchLower) ||
          sale.customer_phone?.includes(searchTerm) ||
          sale.customer_email?.toLowerCase().includes(searchLower) ||
          sale.id?.toLowerCase().includes(searchLower) ||
          sale.payment_method?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Payment method filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === filterBy);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filtering
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setFilterBy('all');
    setDateRange({ start: '', end: '' });
  };

  const handleGenerateBill = (sale) => {
    setSelectedSale(sale);
    setBillDialog(true);
  };

  const handlePrintBill = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return `₹₹{parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate tax amounts
  const calculateTaxes = (sale) => {
    const subtotal = sale.subtotal || (sale.quantity * sale.price_per_brick);
    const discountAmount = sale.discount_amount || 0;
    const taxableAmount = subtotal - discountAmount;
    
    const cgstRate = 6; // 6%
    const sgstRate = 6; // 6%
    
    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const totalTax = cgstAmount + sgstAmount;
    const grandTotal = taxableAmount + totalTax;

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal,
    };
  };

  // Paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
              onClick={() => appActions.showNotification('Export feature coming soon', 'info')}
            >
              Export
            </Button>
          </Box>

          {/* Search and Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by customer name, phone, email, or transaction ID"
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
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filterBy}
                  label="Payment Method"
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSearchClear}
                startIcon={<ClearIcon />}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Results Summary */}
          {searchTerm || filterBy !== 'all' || dateRange.start || dateRange.end ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing {filteredData.length} of {salesData.length} sales records
            </Alert>
          ) : null}

          {/* Sales Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price/Brick</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      Loading sales history...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        {searchTerm || filterBy !== 'all' || dateRange.start || dateRange.end
                          ? 'No sales found matching your search criteria'
                          : 'No sales history available'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>{formatDate(sale.date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {sale.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sale.customer_name || 'Walk-in Customer'}
                          </Typography>
                          {sale.customer_phone && (
                            <Typography variant="caption" color="textSecondary">
                              {sale.customer_phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {sale.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(sale.price_per_brick)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(sale.total_amount)}
                        </Typography>
                        {sale.discount_percentage > 0 && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            ({sale.discount_percentage}% discount)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={sale.payment_method} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sale.status || 'completed'}
                          size="small"
                          color={sale.status === 'completed' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Generate Bill">
                            <IconButton 
                              size="small" 
                              onClick={() => handleGenerateBill(sale)}
                              color="primary"
                            >
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="info">
                              <ViewIcon />
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
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Bill Generation Dialog */}
      <Dialog
        open={billDialog}
        onClose={() => setBillDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { '@media print': { boxShadow: 'none', margin: 0 } }
        }}
      >
        <DialogTitle sx={{ '@media print': { display: 'none' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Tax Invoice</Typography>
            <Box>
              <IconButton onClick={handlePrintBill} color="primary">
                <PrintIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ '@media print': { padding: 2 } }}>
          {selectedSale && (
            <BillComponent sale={selectedSale} />
          )}
        </DialogContent>
        
        <DialogActions sx={{ '@media print': { display: 'none' } }}>
          <Button onClick={() => setBillDialog(false)}>Close</Button>
          <Button variant="contained" onClick={handlePrintBill} startIcon={<PrintIcon />}>
            Print Bill
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Bill Component
function BillComponent({ sale }) {
  const taxes = calculateTaxes(sale);

  const calculateTaxes = (sale) => {
    const subtotal = sale.subtotal || (sale.quantity * sale.price_per_brick);
    const discountAmount = sale.discount_amount || 0;
    const taxableAmount = subtotal - discountAmount;
    
    const cgstRate = 6;
    const sgstRate = 6;
    
    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const totalTax = cgstAmount + sgstAmount;
    const grandTotal = taxableAmount + totalTax;

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal,
    };
  };

  const formatCurrency = (amount) => {
    return `₹₹{parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 2, fontSize: '14px', '@media print': { fontSize: '12px' } }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          BRICK PRODUCTION MANAGER
        </Typography>
        <Typography variant="body1">
          Quality Bricks Manufacturing
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Address: Industrial Area, City, State - PIN
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Phone: +91-XXXXXXXXXX | Email: info@brickmanager.com
        </Typography>
        <Typography variant="body2" color="textSecondary">
          GSTIN: 27AAAAA0000A1Z5
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Bill Details */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="h6" gutterBottom>TAX INVOICE</Typography>
          <Typography variant="body2">
            <strong>Invoice No:</strong> {sale.id}
          </Typography>
          <Typography variant="body2">
            <strong>Date:</strong> {formatDate(sale.date)}
          </Typography>
          <Typography variant="body2">
            <strong>Payment Method:</strong> {sale.payment_method?.toUpperCase()}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle1" gutterBottom><strong>Bill To:</strong></Typography>
          <Typography variant="body2">
            <strong>{sale.customer_name || 'Walk-in Customer'}</strong>
          </Typography>
          {sale.customer_phone && (
            <Typography variant="body2">Phone: {sale.customer_phone}</Typography>
          )}
          {sale.customer_email && (
            <Typography variant="body2">Email: {sale.customer_email}</Typography>
          )}
        </Grid>
      </Grid>

      {/* Items Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="center"><strong>Quantity</strong></TableCell>
              <TableCell align="right"><strong>Rate</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Bricks (Quality Grade B)</TableCell>
              <TableCell align="center">{sale.quantity.toLocaleString()}</TableCell>
              <TableCell align="right">{formatCurrency(sale.price_per_brick)}</TableCell>
              <TableCell align="right">{formatCurrency(taxes.subtotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tax Calculation */}
      <Grid container spacing={3}>
        <Grid item xs={6}>
          {sale.notes && (
            <Box>
              <Typography variant="subtitle2" gutterBottom><strong>Notes:</strong></Typography>
              <Typography variant="body2">{sale.notes}</Typography>
            </Box>
          )}
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ border: '1px solid #ddd', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2">{formatCurrency(taxes.subtotal)}</Typography>
            </Box>
            
            {taxes.discountAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="error">
                  Discount ({sale.discount_percentage}%):
                </Typography>
                <Typography variant="body2" color="error">
                  -{formatCurrency(taxes.discountAmount)}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Taxable Amount:</Typography>
              <Typography variant="body2">{formatCurrency(taxes.taxableAmount)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">CGST (6%):</Typography>
              <Typography variant="body2">{formatCurrency(taxes.cgstAmount)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">SGST (6%):</Typography>
              <Typography variant="body2">{formatCurrency(taxes.sgstAmount)}</Typography>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Grand Total:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(taxes.grandTotal)}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          <strong>Thank you for your business!</strong>
        </Typography>
        <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
          This is a computer-generated invoice and does not require a signature.
        </Typography>
      </Box>
    </Box>
  );
}

export default SalesHistory;