// components/Sales/SalesHistory.js - Fixed version with correct GST handling and Edit functionality
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Button,
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
  Alert,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Edit as EditIcon, // NEW: Import Edit icon
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../../utils/calculations';

const SalesHistory = ({ 
  sales, 
  isLoading, 
  searchFilters, 
  setSearchFilters, 
  filteredSales, 
  onViewInvoice,
  onEditSale, // NEW: Add onEditSale prop for edit functionality
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Handle pagination change
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilters]);

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

  // Check if sale includes GST for display purposes
  const isGSTIncluded = (sale) => {
    return sale.include_gst || sale.gst_included || sale.includeGST || false;
  };

  // NEW: Handle edit sale - convert sale data to form format
  const handleEditSale = (sale) => {
    // Convert sale data to match RecordSaleDialog form format
    const editData = {
      // Original sale data for identification
      originalSale: sale,
      
      // Form data matching RecordSaleDialog defaultValues structure
      saleDate: sale.date || new Date().toISOString().split("T")[0],
      customerName: sale.customer_name || "",
      customerPhone: sale.customer_phone || "",
      customerEmail: sale.customer_email || "",
      customerState: sale.customer_state || "GJ",
      customerStateCode: sale.customer_state_code || "24",
      customerGSTIN: sale.customer_gstin || "",
      locationName: sale.location_name || "",
      quantity: sale.quantity || "",
      pricePerBrick: sale.price_per_brick || 6.15,
      vehicleNumber: sale.vehicle_number || "",
      challanNumber: sale.challan_number || "",
      discount: sale.discount_amount || 0,
      discountType: sale.discount_type || "amount",
      paymentMethod: sale.payment_method || "cash",
      notes: sale.notes || "",
      includeGST: isGSTIncluded(sale),
    };

    // Call the parent component's edit handler
    if (onEditSale) {
      onEditSale(editData);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h6" fontWeight="bold">
            Sales History ({filteredSales?.length})
          </Typography>
          <Box display="flex" gap={1}>
            <TextField
              size="small"
              placeholder="Search sales..."
              value={searchFilters?.searchTerm}
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

        {/* Advanced Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date From"
              type="date"
              size="small"
              fullWidth
              value={searchFilters?.dateFrom}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  dateFrom: e.target.value,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Date To"
              type="date"
              size="small"
              fullWidth
              value={searchFilters?.dateTo}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  dateTo: e.target.value,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Customer"
              size="small"
              fullWidth
              value={searchFilters?.customerName}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  customerName: e.target.value,
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Location"
              size="small"
              fullWidth
              value={searchFilters.locationName}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  locationName: e.target.value,
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Vehicle"
              size="small"
              fullWidth
              value={searchFilters.vehicleNumber}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  vehicleNumber: e.target.value,
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() =>
                setSearchFilters({
                  searchTerm: "",
                  dateFrom: "",
                  dateTo: "",
                  customerName: "",
                  locationName: "",
                  vehicleNumber: "",
                })
              }
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>

        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : filteredSales.length === 0 ? (
          <Alert severity="info">
            No sales found.{" "}
            {sales.history.length === 0
              ? "Start by recording your first sale."
              : "Try adjusting your search filters."}
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Invoice</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Rate</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>GST</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Vehicle</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id || sale.invoice_number} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {sale.invoice_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {sale.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sale.customer_phone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sale.location_name ? (
                          <Chip
                            label={sale.location_name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="No Location"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatQuantity(sale.quantity)}</TableCell>
                      <TableCell>{formatCurrency(sale.price_per_brick)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {getCorrectAmount(sale)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isGSTIncluded(sale) ? "(incl. GST)" : "(excl. GST)"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isGSTIncluded(sale) ? "Included" : "Excluded"}
                          size="small"
                          color={isGSTIncluded(sale) ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {sale.vehicle_number ? (
                          <Chip
                            label={sale.vehicle_number}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="No Vehicle"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {/* NEW: Edit Button */}
                          <Tooltip title="Edit Sale">
                            <IconButton
                              size="small"
                              onClick={() => handleEditSale(sale)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Existing View Invoice Button */}
                          <Tooltip title="View Invoice">
                            <IconButton
                              size="small"
                              onClick={() => onViewInvoice(sale)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} of {filteredSales.length} sales
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesHistory;