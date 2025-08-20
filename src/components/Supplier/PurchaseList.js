// components/suppliers/PurchaseList.js
import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  Pagination,
  Chip,
  Card,
  CardContent,
  alpha,
  useTheme,
  IconButton,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingCart as PurchaseIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Receipt as BillIcon,
  CalendarToday as DateIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { supplierService } from '../../services/supplierService';
import { formatCurrency } from '../../utils/calculations';

const PurchaseList = ({ purchases, suppliers, onPurchaseAdded, onPurchaseUpdated, onPurchaseDeleted }) => {
  const theme = useTheme();
  
  // Pagination and Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Menu and selection
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    supplierId: '',
    supplierName: '',
    supplierGstin: '',
    billNumber: '',
    amount: '',
    cgst: '',
    sgst: '',
    igst: '',
    description: '',
    notes: '',
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Filter purchases based on search
  const filteredPurchases = purchases.filter(purchase => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      purchase.supplier_name?.toLowerCase().includes(searchLower) ||
      purchase.bill_number?.toLowerCase().includes(searchLower) ||
      purchase.description?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);

  // Calculate totals for current view
  const totalAmount = paginatedPurchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
  const totalGst = paginatedPurchases.reduce((sum, purchase) => sum + (purchase.total_gst || 0), 0);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.supplierId) {
      errors.supplier = 'Please select a supplier';
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Valid amount is required';
    }
    
    if (!formData.date) {
      errors.date = 'Purchase date is required';
    }

    // Validate GST percentages
    const cgst = parseFloat(formData.cgst) || 0;
    const sgst = parseFloat(formData.sgst) || 0;
    const igst = parseFloat(formData.igst) || 0;

    // Either CGST+SGST or IGST, not both
    if (igst > 0 && (cgst > 0 || sgst > 0)) {
      errors.gst = 'Use either CGST+SGST or IGST, not both';
    }

    if (cgst > 18 || sgst > 18 || igst > 28) {
      errors.gst = 'GST rates seem too high. Please verify.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
      supplierId: '',
      supplierName: '',
      supplierGstin: '',
      billNumber: '',
      amount: '',
      cgst: '',
      sgst: '',
      igst: '',
      description: '',
      notes: '',
    });
    setFormErrors({});
    setSelectedSupplier(null);
  };

  // Handle supplier selection
  const handleSupplierChange = (event, newValue) => {
    if (newValue) {
      setSelectedSupplier(newValue);
      setFormData(prev => ({
        ...prev,
        supplierId: newValue.id,
        supplierName: newValue.name,
        supplierGstin: newValue.gstin || '',
      }));
    } else {
      setSelectedSupplier(null);
      setFormData(prev => ({
        ...prev,
        supplierId: '',
        supplierName: '',
        supplierGstin: '',
      }));
    }
  };

  // Calculate GST amounts and totals
  const calculateTotals = () => {
    const amount = parseFloat(formData.amount) || 0;
    const cgst = parseFloat(formData.cgst) || 0;
    const sgst = parseFloat(formData.sgst) || 0;
    const igst = parseFloat(formData.igst) || 0;

    const cgstAmount = (amount * cgst) / 100;
    const sgstAmount = (amount * sgst) / 100;
    const igstAmount = (amount * igst) / 100;
    const totalGst = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = amount + totalGst;

    return {
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGst,
      totalAmount,
    };
  };

  // Handle form submission (create or update)
  const handleSubmit = async (isEdit = false) => {
    if (!validateForm()) {
      return;
    }

    // FIXED: Store the current selected purchase before async operations
    const currentSelectedPurchase = selectedPurchase;

    try {
      setLoading(true);
      
      const purchaseData = {
        ...formData,
        date: formData.date, // Already in YYYY-MM-DD format
        amount: parseFloat(formData.amount),
        cgst: parseFloat(formData.cgst) || 0,
        sgst: parseFloat(formData.sgst) || 0,
        igst: parseFloat(formData.igst) || 0,
      };

      let result;
      if (isEdit) {
        // FIXED: Use the stored purchase reference
        if (!currentSelectedPurchase?.id) {
          toast.error('No purchase selected for editing');
          return;
        }
        result = await supplierService.updatePurchase(currentSelectedPurchase.id, purchaseData);
        if (result.success) {
          toast.success('Purchase updated successfully');
          setEditDialogOpen(false);
          // FIXED: Use callback instead of page reload
          if (onPurchaseUpdated) {
            onPurchaseUpdated(result.data);
          } else {
            // Fallback to reload if callback not provided
            window.location.reload();
          }
        }
      } else {
        result = await supplierService.createPurchase(purchaseData);
        if (result.success) {
          onPurchaseAdded(result.data);
          setAddDialogOpen(false);
        }
      }
      
      if (!result.success) {
        toast.error(result.error || 'Failed to save purchase');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast.error('Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete purchase
  const handleDeletePurchase = async () => {
    // FIXED: Store the current selected purchase before async operations
    const currentSelectedPurchase = selectedPurchase;
    
    if (!currentSelectedPurchase?.id) {
      toast.error('No purchase selected for deletion');
      return;
    }

    try {
      setLoading(true);
      
      const result = await supplierService.deletePurchase(currentSelectedPurchase.id);
      
      if (result.success) {
        toast.success('Purchase deleted successfully');
        setDeleteDialogOpen(false);
        // FIXED: Use callback instead of page reload
        if (onPurchaseDeleted) {
          onPurchaseDeleted(currentSelectedPurchase.id);
        } else {
          // Fallback to reload if callback not provided
          window.location.reload();
        }
      } else {
        toast.error(result.error || 'Failed to delete purchase');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Failed to delete purchase');
    } finally {
      setLoading(false);
      setSelectedPurchase(null);
    }
  };

  // Menu handlers
  const handleMenuClick = (event, purchase) => {
    console.log('Menu clicked for purchase:', purchase); // FIXED: Added logging for debugging
    setAnchorEl(event.currentTarget);
    setSelectedPurchase(purchase);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // FIXED: Don't clear selectedPurchase immediately, let the action handlers clear it
    // setSelectedPurchase(null);
  };

  const handleEditClick = () => {
    // FIXED: Add null check for selectedPurchase
    if (!selectedPurchase) {
      toast.error('No purchase selected');
      handleMenuClose();
      return;
    }

    // Pre-populate form with selected purchase data
    const purchase = selectedPurchase;
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    
    setFormData({
      date: purchase.date,
      supplierId: purchase.supplier_id,
      supplierName: purchase.supplier_name,
      supplierGstin: purchase.supplier_gstin,
      billNumber: purchase.bill_number || '',
      amount: purchase.amount?.toString() || '',
      cgst: purchase.cgst?.toString() || '',
      sgst: purchase.sgst?.toString() || '',
      igst: purchase.igst?.toString() || '',
      description: purchase.description || '',
      notes: purchase.notes || '',
    });
    
    if (supplier) {
      setSelectedSupplier(supplier);
    }
    
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    // FIXED: Add null check for selectedPurchase
    if (!selectedPurchase) {
      toast.error('No purchase selected');
      handleMenuClose();
      return;
    }
    
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const totals = calculateTotals();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Purchase Records ({filteredPurchases.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Record Purchase
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search purchases by supplier, bill number, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Box>

      {/* Purchases Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Bill Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>GST</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No purchase records found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPurchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {new Date(purchase.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {purchase.supplier_name}
                      </Typography>
                      {purchase.supplier_gstin && (
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                          {purchase.supplier_gstin}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BillIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" fontFamily="monospace">
                        {purchase.bill_number || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(purchase.amount || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(purchase.total_gst || 0)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {purchase.cgst > 0 && (
                          <Chip label={`CGST: ${purchase.cgst}%`} size="small" color="primary" />
                        )}
                        {purchase.sgst > 0 && (
                          <Chip label={`SGST: ${purchase.sgst}%`} size="small" color="secondary" />
                        )}
                        {purchase.igst > 0 && (
                          <Chip label={`IGST: ${purchase.igst}%`} size="small" color="info" />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formatCurrency(purchase.total_amount || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {purchase.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="More actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, purchase)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredPurchases.length > itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
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
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit Purchase" />
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete Purchase" />
        </MenuItem>
      </Menu>

      {/* Add Purchase Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => {
          setAddDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PurchaseIcon color="primary" />
              <Typography variant="h6">Record New Purchase</Typography>
            </Box>
            <IconButton onClick={() => {
              setAddDialogOpen(false);
              resetForm();
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Date and Supplier Selection */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Purchase Date *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                error={!!formErrors.date}
                helperText={formErrors.date}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={selectedSupplier}
                onChange={handleSupplierChange}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Supplier *" 
                    error={!!formErrors.supplier}
                    helperText={formErrors.supplier}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.type} {option.gstin && `• ${option.gstin}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>

            {/* Supplier GSTIN (auto-filled) */}
            {formData.supplierGstin && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Supplier GSTIN:</strong> {formData.supplierGstin}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Bill Details */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bill/Invoice Number"
                value={formData.billNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                placeholder="Enter bill number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount (before GST) *"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
              />
            </Grid>

            {/* GST Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                GST Details (Enter rates as percentages)
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CGST (%)"
                type="number"
                value={formData.cgst}
                onChange={(e) => setFormData(prev => ({ ...prev, cgst: e.target.value }))}
                inputProps={{ min: 0, max: 18, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SGST (%)"
                type="number"
                value={formData.sgst}
                onChange={(e) => setFormData(prev => ({ ...prev, sgst: e.target.value }))}
                inputProps={{ min: 0, max: 18, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="IGST (%)"
                type="number"
                value={formData.igst}
                onChange={(e) => setFormData(prev => ({ ...prev, igst: e.target.value }))}
                inputProps={{ min: 0, max: 28, step: 0.1 }}
              />
            </Grid>

            {/* GST Error */}
            {formErrors.gst && (
              <Grid item xs={12}>
                <Alert severity="error">{formErrors.gst}</Alert>
              </Grid>
            )}

            {/* Calculation Summary */}
            {formData.amount && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Purchase Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Base Amount</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(parseFloat(formData.amount) || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">GST Amount</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(totals.totalGst)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(totals.totalAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Description and Notes */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of purchase"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setAddDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmit(false)} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Recording...' : 'Record Purchase'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Purchase Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => {
          setEditDialogOpen(false);
          resetForm();
          setSelectedPurchase(null); // FIXED: Clear selected purchase when dialog closes
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon color="primary" />
              <Typography variant="h6">Edit Purchase</Typography>
            </Box>
            <IconButton onClick={() => {
              setEditDialogOpen(false);
              resetForm();
              setSelectedPurchase(null); // FIXED: Clear selected purchase when dialog closes
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Same form content as Add Dialog */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Date and Supplier Selection */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Purchase Date *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                error={!!formErrors.date}
                helperText={formErrors.date}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={selectedSupplier}
                onChange={handleSupplierChange}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Supplier *" 
                    error={!!formErrors.supplier}
                    helperText={formErrors.supplier}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.type} {option.gstin && `• ${option.gstin}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>

            {/* Supplier GSTIN (auto-filled) */}
            {formData.supplierGstin && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Supplier GSTIN:</strong> {formData.supplierGstin}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Bill Details */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bill/Invoice Number"
                value={formData.billNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                placeholder="Enter bill number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount (before GST) *"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
              />
            </Grid>

            {/* GST Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                GST Details (Enter rates as percentages)
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="CGST (%)"
                type="number"
                value={formData.cgst}
                onChange={(e) => setFormData(prev => ({ ...prev, cgst: e.target.value }))}
                inputProps={{ min: 0, max: 18, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SGST (%)"
                type="number"
                value={formData.sgst}
                onChange={(e) => setFormData(prev => ({ ...prev, sgst: e.target.value }))}
                inputProps={{ min: 0, max: 18, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="IGST (%)"
                type="number"
                value={formData.igst}
                onChange={(e) => setFormData(prev => ({ ...prev, igst: e.target.value }))}
                inputProps={{ min: 0, max: 28, step: 0.1 }}
              />
            </Grid>

            {/* GST Error */}
            {formErrors.gst && (
              <Grid item xs={12}>
                <Alert severity="error">{formErrors.gst}</Alert>
              </Grid>
            )}

            {/* Calculation Summary */}
            {formData.amount && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Purchase Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Base Amount</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(parseFloat(formData.amount) || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">GST Amount</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(totals.totalGst)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(totals.totalAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Description and Notes */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of purchase"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setEditDialogOpen(false);
            resetForm();
            setSelectedPurchase(null); // FIXED: Clear selected purchase when dialog closes
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmit(true)} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Purchase'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setSelectedPurchase(null); // FIXED: Clear selected purchase when dialog closes
      }}>
        <DialogTitle>
          <Typography variant="h6" color="error">
            Delete Purchase
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The purchase record will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete this purchase record?
          </Typography>
          {selectedPurchase && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Supplier:</strong> {selectedPurchase.supplier_name}<br/>
                <strong>Date:</strong> {new Date(selectedPurchase.date).toLocaleDateString()}<br/>
                <strong>Amount:</strong> {formatCurrency(selectedPurchase.total_amount)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedPurchase(null); // FIXED: Clear selected purchase when dialog closes
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeletePurchase} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseList;