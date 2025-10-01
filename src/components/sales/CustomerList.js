// components/Sales/CustomerList.js - Simplified without tabs, invoice management in dialog
import React, { useState, useMemo, useEffect } from 'react';
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
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  RequestPage as InvoiceIcon,
  Payment as PaymentIcon,
  Assessment as LedgerIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../../utils/calculations';
import { DB_PATHS } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';
import toast from 'react-hot-toast';

// Import existing components
import StatementGenerator from './StatementGenerator';
import InvoiceGenerator from './InvoiceGenerator';
import PaymentEntry from './PaymentEntry';
import LedgerGenerator from './LedgerGenerator';
import GSTInvoiceViewer from './GSTInvoiceViewer';

const CustomerList = ({ sales, searchFilters, setSearchFilters }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Existing dialog states
  const [statementGeneratorOpen, setStatementGeneratorOpen] = useState(false);
  const [customerForStatement, setCustomerForStatement] = useState(null);
  const [invoiceGeneratorOpen, setInvoiceGeneratorOpen] = useState(false);
  const [customerForInvoice, setCustomerForInvoice] = useState(null);
  const [paymentEntryOpen, setPaymentEntryOpen] = useState(false);
  const [customerForPayment, setCustomerForPayment] = useState(null);
  const [ledgerGeneratorOpen, setLedgerGeneratorOpen] = useState(false);
  const [customerForLedger, setCustomerForLedger] = useState(null);

  // NEW: Invoice Management Dialog states
  const [invoiceManagementOpen, setInvoiceManagementOpen] = useState(false);
  const [customerForInvoiceManagement, setCustomerForInvoiceManagement] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Invoice viewing states
  const [invoiceViewDialogOpen, setInvoiceViewDialogOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);
  const [gstInvoiceViewerOpen, setGstInvoiceViewerOpen] = useState(false);
  const [nonGstInvoiceViewerOpen, setNonGstInvoiceViewerOpen] = useState(false);
  const [viewingInvoiceData, setViewingInvoiceData] = useState(null);
  
  // Edit invoice states
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Process customers data
  const processedCustomers = useMemo(() => {
    const uniqueCustomers = sales.history.reduce((acc, sale) => {
      const key = `${sale.customer_name}_${sale.customer_phone}`;
      if (!acc[key]) {
        acc[key] = {
          name: sale.customer_name,
          phone: sale.customer_phone,
          email: sale.customer_email || '',
          totalPurchases: 0,
          totalAmount: 0,
          totalQuantity: 0,
          lastPurchase: sale.date,
          firstPurchase: sale.date,
          locations: new Set()
        };
      }
      acc[key].totalPurchases += 1;
      acc[key].totalAmount += parseFloat(sale.total_amount || 0);
      acc[key].totalQuantity += parseInt(sale.quantity || 0);
      if (sale.location_name) {
        acc[key].locations.add(sale.location_name);
      }
      if (sale.date > acc[key].lastPurchase) {
        acc[key].lastPurchase = sale.date;
      }
      if (sale.date < acc[key].firstPurchase) {
        acc[key].firstPurchase = sale.date;
      }
      return acc;
    }, {});

    return Object.values(uniqueCustomers)
      .filter(customer => {
        const searchTerm = searchFilters.searchTerm?.toLowerCase() || '';
        return (
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.phone.includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm)
        );
      })
      .sort((a, b) => new Date(b.lastPurchase) - new Date(a.lastPurchase));
  }, [sales.history, searchFilters.searchTerm]);

  // Fetch customer invoices
  const fetchCustomerInvoices = async (customer) => {
    if (!customer) return;

    try {
      setLoadingInvoices(true);
      
      
      const result = await dbUtils.readData(`bricks/sales/invoices`);
      
      
      if (result.success && result.data) {
        const invoices = Object.entries(result.data)
          .map(([id, invoice]) => ({ ...invoice, id }))
          .filter(invoice => 
            invoice.customerName === customer.name && 
            invoice.customerPhone === customer.phone
          )
          .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

        
        setCustomerInvoices(invoices);
      } else {
        
        setCustomerInvoices([]);
      }
    } catch (error) {
      
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(processedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = processedCustomers.slice(startIndex, endIndex);

  // Event handlers
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setCurrentPage(1);
  };

  // Menu handlers
  const handleMenuClick = (event, customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  // Existing handlers
  const handleGenerateStatement = () => {
    setCustomerForStatement(selectedCustomer);
    setStatementGeneratorOpen(true);
    handleMenuClose();
  };

  const handleStatementGeneratorClose = () => {
    setStatementGeneratorOpen(false);
    setCustomerForStatement(null);
  };

  const handleGenerateInvoice = () => {
    setCustomerForInvoice(selectedCustomer);
    setIsEditMode(false);
    setEditingInvoice(null);
    setInvoiceGeneratorOpen(true);
    handleMenuClose();
  };

  const handleInvoiceGeneratorClose = () => {
    setInvoiceGeneratorOpen(false);
    setCustomerForInvoice(null);
    setIsEditMode(false);
    setEditingInvoice(null);
    // Refresh invoices if invoice management dialog is open
    if (invoiceManagementOpen && customerForInvoiceManagement) {
      fetchCustomerInvoices(customerForInvoiceManagement);
    }
  };

  const handlePaymentEntry = () => {
    setCustomerForPayment(selectedCustomer);
    setPaymentEntryOpen(true);
    handleMenuClose();
  };

  const handlePaymentEntryClose = () => {
    setPaymentEntryOpen(false);
    setCustomerForPayment(null);
  };

  const handlePaymentSaved = async (paymentData) => {
    
  };

  const handleGenerateLedger = () => {
    setCustomerForLedger(selectedCustomer);
    setLedgerGeneratorOpen(true);
    handleMenuClose();
  };

  const handleLedgerGeneratorClose = () => {
    setLedgerGeneratorOpen(false);
    setCustomerForLedger(null);
  };

  // NEW: Invoice Management Dialog handlers
  const handleViewInvoices = () => {
    
    setCustomerForInvoiceManagement(selectedCustomer);
    setInvoiceManagementOpen(true);
    handleMenuClose();
    // Fetch invoices for the selected customer
    fetchCustomerInvoices(selectedCustomer);
  };

  const handleInvoiceManagementClose = () => {
    setInvoiceManagementOpen(false);
    setCustomerForInvoiceManagement(null);
    setCustomerInvoices([]);
  };

  // Edit invoice handler
  const handleEditInvoice = (invoice) => {
    
    setEditingInvoice(invoice);
    setCustomerForInvoice(customerForInvoiceManagement);
    setIsEditMode(true);
    setInvoiceGeneratorOpen(true);
  };

  const handleDeleteInvoice = async (invoice) => {
    if (window.confirm(`Are you sure you want to delete this invoice?`)) {
      try {
        const result = await dbUtils.deleteData(`bricks/sales/invoices/${invoice.id}`);
        if (result.success) {
          toast.success('Invoice deleted successfully');
          fetchCustomerInvoices(customerForInvoiceManagement);
        } else {
          toast.error('Failed to delete invoice');
        }
      } catch (error) {
        
        toast.error('Failed to delete invoice');
      }
    }
  };

  // View invoice details handler
  const handleViewInvoiceDetails = (invoice) => {
    
    setSelectedInvoiceForView(invoice);
    setViewingInvoiceData(invoice.invoiceData);
    setInvoiceViewDialogOpen(true);
  };

  // Direct invoice viewers
  const handleViewGSTInvoice = () => {
    if (viewingInvoiceData && selectedInvoiceForView) {
      setGstInvoiceViewerOpen(true);
    }
  };

  const handleViewNonGSTInvoice = () => {
    if (viewingInvoiceData && selectedInvoiceForView) {
      setNonGstInvoiceViewerOpen(true);
    }
  };

  const handleCloseInvoiceViewers = () => {
    setGstInvoiceViewerOpen(false);
    setNonGstInvoiceViewerOpen(false);
  };

  const handleCloseInvoiceViewDialog = () => {
    setInvoiceViewDialogOpen(false);
    setSelectedInvoiceForView(null);
    setViewingInvoiceData(null);
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Customer List ({processedCustomers.length})
          </Typography>
          <Box display="flex" gap={1}>
            <TextField
              size="small"
              placeholder="Search customers..."
              value={searchFilters.searchTerm || ''}
              onChange={(e) => setSearchFilters({ ...searchFilters, searchTerm: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
          </Box>
        </Box>

        {/* Customer Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer Info</TableCell>
                <TableCell align="center">Total Purchases</TableCell>
                <TableCell align="center">Total Quantity</TableCell>
                <TableCell align="center">Total Amount</TableCell>
                <TableCell align="center">Last Purchase</TableCell>
                <TableCell align="center">Locations</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCustomers.map((customer, index) => (
                <TableRow key={`${customer.name}_${customer.phone}`} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.phone}
                      </Typography>
                      {customer.email && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {customer.email}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={customer.totalPurchases}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {formatQuantity(customer.totalQuantity)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {formatCurrency(customer.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption">
                      {new Date(customer.lastPurchase).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="center">
                      {Array.from(customer.locations).slice(0, 2).map((location) => (
                        <Chip
                          key={location}
                          label={location}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                      {customer.locations.size > 2 && (
                        <Chip
                          label={`+${customer.locations.size - 2}`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, customer)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {processedCustomers.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1}-{Math.min(endIndex, processedCustomers.length)} of {processedCustomers.length}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Per page</InputLabel>
                <Select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  label="Per page"
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 220 }
          }}
        >
          <MenuItem onClick={handleGenerateStatement}>
            <ListItemIcon>
              <ReceiptIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Generate Statement" />
          </MenuItem>
          <MenuItem onClick={handleGenerateInvoice}>
            <ListItemIcon>
              <InvoiceIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Generate GST/Non-GST Invoice" />
          </MenuItem>
          <MenuItem onClick={handleViewInvoices}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View Generated Invoices" />
          </MenuItem>
          <MenuItem onClick={handlePaymentEntry}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Payment Entry" />
          </MenuItem>
          <MenuItem onClick={handleGenerateLedger}>
            <ListItemIcon>
              <LedgerIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Generate Ledger" />
          </MenuItem>
        </Menu>
      </CardContent>

      {/* NEW: Invoice Management Dialog */}
      <Dialog
        open={invoiceManagementOpen}
        onClose={handleInvoiceManagementClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InvoiceIcon color="primary" />
              <Typography variant="h6">
                Invoice Management - {customerForInvoiceManagement?.name}
              </Typography>
            </Box>
            <IconButton onClick={handleInvoiceManagementClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Generated Invoices ({customerInvoices.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => fetchCustomerInvoices(customerForInvoiceManagement)}
                  disabled={loadingInvoices}
                >
                  {loadingInvoices ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<InvoiceIcon />}
                  onClick={() => {
                    setCustomerForInvoice(customerForInvoiceManagement);
                    setIsEditMode(false);
                    setEditingInvoice(null);
                    setInvoiceGeneratorOpen(true);
                  }}
                >
                  Generate New Invoice
                </Button>
              </Box>
            </Box>

            {loadingInvoices ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : customerInvoices.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Details</TableCell>
                      <TableCell align="center">Date Range</TableCell>
                      <TableCell align="center">GST Bricks</TableCell>
                      <TableCell align="center">Non-GST Bricks</TableCell>
                      <TableCell align="center">Total Amount</TableCell>
                      <TableCell align="center">Created Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerInvoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {invoice.selectedSite}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {invoice.id.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="caption">
                            {invoice.fromDate} to {invoice.toDate}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatQuantity(invoice.gstBricks)}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatQuantity(invoice.nonGstBricks)}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(invoice.invoiceData?.totalAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="caption">
                            {new Date(invoice.createdDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewInvoiceDetails(invoice)}
                            >
                              View
                            </Button>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditInvoice(invoice)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteInvoice(invoice)}
                            >
                              Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <InvoiceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No invoices generated yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Generate your first GST/Non-GST invoice for this customer
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<InvoiceIcon />}
                    onClick={() => {
                      setCustomerForInvoice(customerForInvoiceManagement);
                      setIsEditMode(false);
                      setEditingInvoice(null);
                      setInvoiceGeneratorOpen(true);
                    }}
                  >
                    Generate Invoice
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInvoiceManagementClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invoice View Dialog */}
      <Dialog
        open={invoiceViewDialogOpen}
        onClose={handleCloseInvoiceViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InvoiceIcon color="primary" />
              <Typography variant="h6">
                Invoice Details
              </Typography>
            </Box>
            <IconButton onClick={handleCloseInvoiceViewDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoiceForView && viewingInvoiceData ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary for {selectedInvoiceForView.customerName}
                </Typography>
                <Typography variant="body2">
                  Generated on {new Date(selectedInvoiceForView.createdDate).toLocaleDateString()} 
                  for the period {selectedInvoiceForView.fromDate} to {selectedInvoiceForView.toDate}
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="error">
                        GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong> {formatQuantity(selectedInvoiceForView.gstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong> {formatCurrency(viewingInvoiceData.actualRate)} per brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (with 5% GST):</strong> {formatCurrency(viewingInvoiceData.gstAmount)}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<ViewIcon />}
                          onClick={handleViewGSTInvoice}
                          disabled={selectedInvoiceForView.gstBricks === 0}
                          fullWidth
                        >
                          View GST Invoice
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="success.main">
                        Non-GST Invoice Details
                      </Typography>
                      <Typography variant="body1">
                        <strong>Bricks:</strong> {formatQuantity(selectedInvoiceForView.nonGstBricks)}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Rate:</strong> {formatCurrency(viewingInvoiceData.actualRate)} per brick
                      </Typography>
                      <Typography variant="body1">
                        <strong>Amount (without GST):</strong> {formatCurrency(viewingInvoiceData.nonGstAmount)}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ViewIcon />}
                          onClick={handleViewNonGSTInvoice}
                          disabled={selectedInvoiceForView.nonGstBricks === 0}
                          fullWidth
                        >
                          View Non-GST Invoice
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Invoice Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Total Bricks</Typography>
                          <Typography variant="h6">{formatQuantity(viewingInvoiceData.totalBricks)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">GST Amount</Typography>
                          <Typography variant="h6" color="error.main">{formatCurrency(viewingInvoiceData.gstAmount)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Non-GST Amount</Typography>
                          <Typography variant="h6" color="success.main">{formatCurrency(viewingInvoiceData.nonGstAmount)}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                          <Typography variant="h6" color="primary.main">{formatCurrency(viewingInvoiceData.totalAmount)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography>No invoice data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInvoiceViewDialog}>Close</Button>
          {selectedInvoiceForView && (
            <Button 
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                handleCloseInvoiceViewDialog();
                handleEditInvoice(selectedInvoiceForView);
              }}
            >
              Edit Invoice
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Existing Components */}
      <StatementGenerator
        open={statementGeneratorOpen}
        onClose={handleStatementGeneratorClose}
        customer={customerForStatement}
        salesHistory={sales.history}
      />

      <InvoiceGenerator
        open={invoiceGeneratorOpen}
        onClose={handleInvoiceGeneratorClose}
        customer={customerForInvoice}
        salesHistory={sales.history}
        editingInvoice={editingInvoice}
        isEditMode={isEditMode}
      />

      <PaymentEntry
        open={paymentEntryOpen}
        onClose={handlePaymentEntryClose}
        customer={customerForPayment}
        onPaymentSaved={handlePaymentSaved}
      />

      <LedgerGenerator
        open={ledgerGeneratorOpen}
        onClose={handleLedgerGeneratorClose}
        customer={customerForLedger}
        salesHistory={sales.history}
      />

      {/* GST Invoice Viewers for direct viewing */}
      {viewingInvoiceData && selectedInvoiceForView && (
        <>
          <GSTInvoiceViewer
            open={gstInvoiceViewerOpen}
            onClose={handleCloseInvoiceViewers}
            customerData={viewingInvoiceData.customerData}
            invoiceData={viewingInvoiceData}
            brickQuantity={selectedInvoiceForView.gstBricks}
            pricePerBrick={viewingInvoiceData.actualRate}
            isGSTInvoice={true}
          />

          <GSTInvoiceViewer
            open={nonGstInvoiceViewerOpen}
            onClose={handleCloseInvoiceViewers}
            customerData={viewingInvoiceData.customerData}
            invoiceData={viewingInvoiceData}
            brickQuantity={selectedInvoiceForView.nonGstBricks}
            pricePerBrick={viewingInvoiceData.actualRate}
            isGSTInvoice={false}
          />
        </>
      )}
    </Card>
  );
};

export default CustomerList;