// components/Sales/SalesHistory.js - Fixed version with correct GST handling, Edit functionality, and Delete functionality
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../../utils/calculations';
import { productionService } from '../../services/productionService';

const SalesHistory = ({ 
  sales, 
  isLoading, 
  searchFilters, 
  setSearchFilters, 
  filteredSales, 
  onViewInvoice,
  onEditSale,
  onDeleteSale, // NEW: Add onDeleteSale prop
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Date range production total state
  const [rangeProductionTotal, setRangeProductionTotal] = useState(0);

  // Fetch production total for selected date range directly from service
  useEffect(() => {
    const fetchProductionTotal = async () => {
      if (!searchFilters?.dateFrom && !searchFilters?.dateTo) {
        setRangeProductionTotal(0);
        return;
      }
      const result = await productionService.getProductionHistory(
        1000,
        searchFilters?.dateFrom || null,
        searchFilters?.dateTo || null
      );
      if (result.success) {
        const total = result.data.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        setRangeProductionTotal(total);
      }
    };
    fetchProductionTotal();
  }, [searchFilters?.dateFrom, searchFilters?.dateTo]);

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
    setCurrentPage(1);
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
    
    const gstIncluded = sale.include_gst || sale.gst_included || sale.includeGST || false;
    
    if (gstIncluded) {
      return formatCurrency(sale.total_amount);
    } else {
      const subtotal = quantity * pricePerBrick;
      const amountAfterDiscount = subtotal - discountAmount;
      return formatCurrency(amountAfterDiscount);
    }
  };

  // Check if sale includes GST for display purposes
  const isGSTIncluded = (sale) => {
    return sale.include_gst || sale.gst_included || sale.includeGST || false;
  };

  // Handle edit sale
  const handleEditSale = (sale) => {
    const editData = {
      originalSale: sale,
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

    if (onEditSale) {
      onEditSale(editData);
    }
  };

  // Handle delete click - open confirmation dialog
  const handleDeleteClick = (sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!saleToDelete || !onDeleteSale) return;
    
    setDeleting(true);
    try {
      await onDeleteSale(saleToDelete);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
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

        {/* Date Range Report Summary */}
        {(searchFilters?.dateFrom || searchFilters?.dateTo) && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Date Range Report: {searchFilters?.dateFrom || 'Start'} to {searchFilters?.dateTo || 'End'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Bricks Sold</Typography>
                <Typography variant="h6" color="primary.main" fontWeight="bold">
                  {filteredSales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Bricks Produced</Typography>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {rangeProductionTotal.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

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
                          {/* Edit Button */}
                          <Tooltip title="Edit Sale">
                            <IconButton
                              size="small"
                              onClick={() => handleEditSale(sale)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {/* View Invoice Button */}
                          <Tooltip title="View Invoice">
                            <IconButton
                              size="small"
                              onClick={() => onViewInvoice(sale)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>

                          {/* NEW: Delete Button */}
                          <Tooltip title="Delete Sale (restores stock)">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(sale)}
                              color="error"
                            >
                              <DeleteIcon />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Sale</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice{' '}
            <strong>{saleToDelete?.invoice_number}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently delete the sale record and restore{' '}
            <strong>{saleToDelete ? Number(saleToDelete.quantity).toLocaleString() : 0} bricks</strong>{' '}
            back to inventory.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SalesHistory;