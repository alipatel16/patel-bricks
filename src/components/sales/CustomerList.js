// components/Sales/CustomerList.js - Updated with Invoice Generation
import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  RequestPage as InvoiceIcon,
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../../utils/calculations';

// Import components
import StatementGenerator from './StatementGenerator';
import InvoiceGenerator from './InvoiceGenerator'; // NEW: Import the invoice generator

const CustomerList = ({ sales, searchFilters, setSearchFilters }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Statement generator state
  const [statementGeneratorOpen, setStatementGeneratorOpen] = useState(false);
  const [customerForStatement, setCustomerForStatement] = useState(null);

  // NEW: Invoice generator state
  const [invoiceGeneratorOpen, setInvoiceGeneratorOpen] = useState(false);
  const [customerForInvoice, setCustomerForInvoice] = useState(null);

  // Process customers data (existing functionality)
  const processedCustomers = useMemo(() => {
    // Calculate unique customers from sales history
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

  // Pagination calculations (existing functionality)
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

  // Statement generation handlers (existing)
  const handleGenerateStatement = () => {
    setCustomerForStatement(selectedCustomer);
    setStatementGeneratorOpen(true);
    handleMenuClose();
  };

  const handleStatementGeneratorClose = () => {
    setStatementGeneratorOpen(false);
    setCustomerForStatement(null);
  };

  // NEW: Invoice generation handlers
  const handleGenerateInvoice = () => {
    setCustomerForInvoice(selectedCustomer);
    setInvoiceGeneratorOpen(true);
    handleMenuClose();
  };

  const handleInvoiceGeneratorClose = () => {
    setInvoiceGeneratorOpen(false);
    setCustomerForInvoice(null);
  };

  return (
    <Card>
      <CardContent>
        {/* Header (existing) */}
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

        {/* Customer Table (existing) */}
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

        {/* Pagination (existing) */}
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
      </CardContent>

      {/* Action Menu - UPDATED with new invoice option */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem onClick={handleGenerateStatement}>
          <ListItemIcon>
            <ReceiptIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Generate Statement" />
        </MenuItem>
        {/* NEW: Invoice generation menu item */}
        <MenuItem onClick={handleGenerateInvoice}>
          <ListItemIcon>
            <InvoiceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Generate GST/Non-GST Invoice" />
        </MenuItem>
      </Menu>

      {/* Statement Generator Component (existing) */}
      <StatementGenerator
        open={statementGeneratorOpen}
        onClose={handleStatementGeneratorClose}
        customer={customerForStatement}
        salesHistory={sales.history}
      />

      {/* NEW: Invoice Generator Component */}
      <InvoiceGenerator
        open={invoiceGeneratorOpen}
        onClose={handleInvoiceGeneratorClose}
        customer={customerForInvoice}
        salesHistory={sales.history}
      />
    </Card>
  );
};

export default CustomerList;