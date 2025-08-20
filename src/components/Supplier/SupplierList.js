// components/suppliers/SupplierList.js
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
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Pagination,
  Menu,
  ListItemIcon,
  ListItemText,
  Alert,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  LocalShipping as SupplierIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { supplierService } from '../../services/supplierService';
import { VALIDATION_RULES } from '../../utils/constants';
import { formatCurrency } from '../../utils/calculations';

const SupplierList = ({ suppliers, onSupplierAdded, onSupplierUpdated, onSupplierDeleted }) => {
  const theme = useTheme();
  
  // Pagination and Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    type: '',
    phone: '',
    address: '',
    notes: '',
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Filter and search suppliers
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Supplier name is required';
    }
    
    // REMOVED: GSTIN validation as requested
    // Allow any GSTIN format for flexibility
    
    if (!formData.type) {
      errors.type = 'Supplier type is required';
    }
    
    if (formData.phone && !VALIDATION_RULES.PHONE_REGEX.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }
    
    if (formData.email && !VALIDATION_RULES.EMAIL_REGEX.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (formData.address.pincode && !VALIDATION_RULES.PINCODE_REGEX.test(formData.address.pincode)) {
      errors.pincode = 'Invalid pincode format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      gstin: '',
      type: '',
      phone: '',
      address: '',
      notes: '',
    });
    setFormErrors({});
  };

  // Handle form submission
  const handleSubmit = async (isEdit = false) => {
    if (!validateForm()) {
      console.log('Form validation failed:', formErrors);
      return;
    }

    // FIXED: Store the current selected supplier before async operations
    const currentSelectedSupplier = selectedSupplier;

    try {
      setLoading(true);
      console.log('Submitting form data:', formData);
      console.log('Is edit mode:', isEdit);
      console.log('Selected supplier:', currentSelectedSupplier);
      
      // FIXED: Properly structure the data for API call
      const supplierData = {
        name: formData.name,
        gstin: formData.gstin,
        type: formData.type,
        phone: formData.phone, // This will be handled by service to create contact object
        address: formData.address, // This will be handled by service to create address object
        notes: formData.notes,
      };
      
      let result;
      if (isEdit) {
        // FIXED: Use the stored supplier reference
        if (!currentSelectedSupplier?.id) {
          toast.error('No supplier selected for editing');
          return;
        }
        result = await supplierService.updateSupplier(currentSelectedSupplier.id, supplierData);
        console.log('Update result:', result);
        if (result.success) {
          onSupplierUpdated(result.data);
          setEditDialogOpen(false);
        }
      } else {
        result = await supplierService.createSupplier(supplierData);
        console.log('Create result:', result);
        if (result.success) {
          onSupplierAdded(result.data);
          setAddDialogOpen(false);
        }
      }

      if (!result.success) {
        console.error('Operation failed:', result.error);
        toast.error(result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      setLoading(false);
      resetForm();
    }
  };

  // Handle delete supplier
  const handleDeleteSupplier = async () => {
    // FIXED: Store the current selected supplier before async operations
    const currentSelectedSupplier = selectedSupplier;
    
    if (!currentSelectedSupplier?.id) {
      toast.error('No supplier selected for deletion');
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting supplier:', currentSelectedSupplier);
      
      const result = await supplierService.deleteSupplier(currentSelectedSupplier.id);
      console.log('Delete result:', result);
      
      if (result.success) {
        onSupplierDeleted(currentSelectedSupplier.id);
        setDeleteDialogOpen(false);
      } else {
        console.error('Delete failed:', result.error);
        toast.error(result.error || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    } finally {
      setLoading(false);
      setSelectedSupplier(null);
    }
  };

  // Menu handlers
  const handleMenuClick = (event, supplier) => {
    console.log('Menu clicked for supplier:', supplier); // FIXED: Added logging for debugging
    setAnchorEl(event.currentTarget);
    setSelectedSupplier(supplier);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // FIXED: Don't clear selectedSupplier immediately, let the action handlers clear it
    // setSelectedSupplier(null);
  };

  // FIXED: Properly handle edit click with correct data structure
  const handleEditClick = () => {
    // FIXED: Add null check for selectedSupplier
    if (!selectedSupplier) {
      toast.error('No supplier selected');
      handleMenuClose();
      return;
    }

    console.log('Edit clicked for supplier:', selectedSupplier);
    
    const editFormData = {
      name: selectedSupplier.name || '',
      gstin: selectedSupplier.gstin || '',
      type: selectedSupplier.type || '',
      phone: selectedSupplier.contact?.phone || '',
      address: selectedSupplier.address?.line1 || '',
      notes: selectedSupplier.notes || '',
    };
    
    console.log('Setting form data for edit:', editFormData);
    setFormData(editFormData);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    // FIXED: Add null check for selectedSupplier
    if (!selectedSupplier) {
      toast.error('No supplier selected');
      handleMenuClose();
      return;
    }
    
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Box>
      {/* Header with Search and Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Supplier List ({filteredSuppliers.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Supplier
        </Button>
      </Box>

      {/* Search and Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
      </Grid>

      {/* Suppliers Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Supplier Details</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>GSTIN</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Purchase Stats</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No suppliers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <TableRow key={supplier.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {supplier.name}
                      </Typography>
                      {supplier.address?.line1 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {supplier.address.line1}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={supplier.type} 
                      color="default"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {supplier.gstin || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {supplier.contact?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption">{supplier.contact.phone}</Typography>
                        </Box>
                      )}
                      {!supplier.contact?.phone && (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        <strong>{supplier.total_purchases || 0}</strong> purchases
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(supplier.total_amount || 0)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="More actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, supplier)}
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
      {filteredSuppliers.length > itemsPerPage && (
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
          <ListItemText primary="Edit Supplier" />
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete Supplier" />
        </MenuItem>
      </Menu>

      {/* Add Supplier Dialog */}
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
              <SupplierIcon color="primary" />
              <Typography variant="h6">Add New Supplier</Typography>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier Type *"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                error={!!formErrors.type}
                helperText={formErrors.type}
                placeholder="e.g. Cement, Raw Material, Equipment"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                placeholder="22AAAAA0000A1Z5 (Optional)"
                helperText="GSTIN number (optional)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Complete address"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about supplier"
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
            {loading ? 'Adding...' : 'Add Supplier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => {
          setEditDialogOpen(false);
          resetForm();
          setSelectedSupplier(null); // FIXED: Clear selected supplier when dialog closes
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon color="primary" />
              <Typography variant="h6">Edit Supplier</Typography>
            </Box>
            <IconButton onClick={() => {
              setEditDialogOpen(false);
              resetForm();
              setSelectedSupplier(null); // FIXED: Clear selected supplier when dialog closes
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Same form content as Add Dialog */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier Type *"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                error={!!formErrors.type}
                helperText={formErrors.type}
                placeholder="e.g. Cement, Raw Material, Equipment"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                placeholder="22AAAAA0000A1Z5 (Optional)"
                helperText="GSTIN number (optional)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Complete address"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about supplier"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setEditDialogOpen(false);
            resetForm();
            setSelectedSupplier(null); // FIXED: Clear selected supplier when dialog closes
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmit(true)} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Supplier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setSelectedSupplier(null); // FIXED: Clear selected supplier when dialog closes
      }}>
        <DialogTitle>
          <Typography variant="h6" color="error">
            Delete Supplier
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The supplier will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete supplier "{selectedSupplier?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedSupplier(null); // FIXED: Clear selected supplier when dialog closes
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteSupplier} 
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

export default SupplierList;