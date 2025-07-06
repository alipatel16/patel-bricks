// components/Sales/CustomerList.js - Fixed version
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
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../../utils/calculations';

// Import StatementGenerator component
import StatementGenerator from './StatementGenerator';

const CustomerList = ({ sales, searchFilters, setSearchFilters }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Statement generator state
  const [statementGeneratorOpen, setStatementGeneratorOpen] = useState(false);
  // NEW: Separate state to store customer for statement generation
  const [customerForStatement, setCustomerForStatement] = useState(null);

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

  // FIXED: Modified to preserve customer data for statement generation
  const handleGenerateStatement = () => {
    // Store the customer data separately before closing menu
    setCustomerForStatement(selectedCustomer);
    setStatementGeneratorOpen(true);
    handleMenuClose(); // Now it's safe to close the menu
  };

  // ADDED: Handle statement generator close
  const handleStatementGeneratorClose = () => {
    setStatementGeneratorOpen(false);
    setCustomerForStatement(null); // Clear the stored customer data
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
              value={searchFilters.searchTerm}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  searchTerm: e.target.value,
                })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Orders</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Quantity</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Locations</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Last Purchase</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Customer Since</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      {sales.history.length === 0 
                        ? "No customers yet. Start by recording your first sale."
                        : "No customers match your search criteria."
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer, index) => (
                  <TableRow key={`${customer.name}_${customer.phone}`} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customer.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customer.email || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={customer.totalPurchases}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {formatCurrency(customer.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatQuantity(customer.totalQuantity)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.from(customer.locations).slice(0, 2).map((location) => (
                          <Chip
                            key={location}
                            label={location}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {customer.locations.size > 2 && (
                          <Chip
                            label={`+${customer.locations.size - 2} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {customer.locations.size === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No locations
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customer.lastPurchase}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {customer.firstPurchase}
                      </Typography>
                    </TableCell>
                    {/* Action button column */}
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, customer)}
                        sx={{ color: 'primary.main' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls (existing) */}
        {processedCustomers.length > 0 && (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderTopColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1}-{Math.min(endIndex, processedCustomers.length)} of {processedCustomers.length} customers
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

      {/* Action Menu */}
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
      </Menu>

      {/* FIXED: Statement Generator Component - now uses customerForStatement */}
      <StatementGenerator
        open={statementGeneratorOpen}
        onClose={handleStatementGeneratorClose}
        customer={customerForStatement}
        salesHistory={sales.history}
      />
    </Card>
  );
};

export default CustomerList;