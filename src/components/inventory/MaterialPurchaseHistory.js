import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Button,
  TextField,
  TablePagination,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Import contexts and services
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { inventoryService } from '../../services/inventoryService';

function MaterialPurchaseHistory() {
  const theme = useTheme();
  const { actions: appActions } = useApp();
  const { actions: inventoryActions } = useInventory();

  // Material types configuration
  const materialTypes = [
    { value: 'sand', label: 'Sand', unit: 'tons', color: 'warning' },
    { value: 'fly_ash', label: 'Fly Ash', unit: 'tons', color: 'info' },
    { value: 'dust', label: 'Dust', unit: 'tons', color: 'secondary' },
    { value: 'lime', label: 'Lime', unit: 'tons', color: 'success' },
    { value: 'chemical', label: 'Chemical', unit: 'litres', color: 'error' },
  ];

  // Purchase history state
  const [materialPurchaseHistory, setMaterialPurchaseHistory] = useState([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter state
  const [filterMaterial, setFilterMaterial] = useState('all');

  // Edit/delete states
  const [editPurchaseDialogOpen, setEditPurchaseDialogOpen] = useState(false);
  const [deletePurchaseDialogOpen, setDeletePurchaseDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [deletingPurchase, setDeletingPurchase] = useState(false);

  // Form management for edit purchase
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    watch: editWatch,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting }
  } = useForm({
    defaultValues: {
      date: '',
      materialType: 'sand',
      quantity: '',
      purchaseRate: '',
      supplier: '',
      notes: '',
    }
  });

  // Watch material type in edit form
  const editSelectedMaterialType = editWatch('materialType');
  const editSelectedMaterial = materialTypes.find(m => m.value === editSelectedMaterialType);

  // Load material purchase history
  const loadMaterialPurchaseHistory = async () => {
    try {
      setPurchaseHistoryLoading(true);
      // Use Firebase-based service method
      const result = await inventoryService.getMaterialPurchaseHistory(null);
      
      if (result.success) {
        setMaterialPurchaseHistory(result.data || []);
      } else {
        console.error('Failed to load material purchase history:', result.error);
        setMaterialPurchaseHistory([]);
      }
    } catch (error) {
      console.error('Error loading material purchase history:', error);
      setMaterialPurchaseHistory([]);
    } finally {
      setPurchaseHistoryLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadMaterialPurchaseHistory();
  }, []);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    setFilterMaterial(event.target.value);
    setPage(0);
  };

  // Handle edit purchase
  const handleEditPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    resetEdit({
      date: purchase.date || new Date(purchase.timestamp).toISOString().split('T')[0],
      materialType: purchase.material_type,
      quantity: purchase.quantity,
      purchaseRate: purchase.purchase_rate,
      supplier: purchase.supplier || '',
      notes: purchase.notes || '',
    });
    setEditPurchaseDialogOpen(true);
  };

  // Handle delete purchase
  const handleDeletePurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setDeletePurchaseDialogOpen(true);
  };

  // Confirm edit purchase
  const onEditSubmit = async (data) => {
    if (!selectedPurchase) return;

    setEditingPurchase(true);
    try {
      // Calculate differences for inventory adjustment
      const originalQuantity = selectedPurchase.quantity;
      const newQuantity = parseFloat(data.quantity);
      const quantityDifference = newQuantity - originalQuantity;

      // Update the purchase record using Firebase service
      const updateResult = await inventoryService.updateMaterialPurchase(selectedPurchase.id, {
        date: data.date,
        material_type: data.materialType,
        quantity: newQuantity,
        purchase_rate: parseFloat(data.purchaseRate),
        total_cost: newQuantity * parseFloat(data.purchaseRate),
        unit: editSelectedMaterial.unit,
        supplier: data.supplier,
        notes: data.notes,
      });

      if (updateResult.success) {
        // Adjust material inventory based on the difference if material type hasn't changed
        if (quantityDifference !== 0 && data.materialType === selectedPurchase.material_type) {
          const operation = quantityDifference > 0 ? "add" : "subtract";
          const amount = Math.abs(quantityDifference);
          
          await inventoryService.updateMaterialStock(
            data.materialType,
            amount,
            operation,
            `Adjusted from edited purchase: ${quantityDifference > 0 ? '+' : '-'}${amount} ${editSelectedMaterial.unit}`
          );
        }

        appActions.showNotification('Material purchase updated successfully', 'success');
        loadMaterialPurchaseHistory();
        // Trigger inventory refresh using the service's force sync
        inventoryService.forceSyncInventory();
        setEditPurchaseDialogOpen(false);
        setSelectedPurchase(null);
      } else {
        appActions.showNotification('Failed to update material purchase', 'error');
      }
    } catch (error) {
      console.error('Error updating material purchase:', error);
      appActions.showNotification('Failed to update material purchase', 'error');
    } finally {
      setEditingPurchase(false);
    }
  };

  // Confirm delete purchase
  const confirmDeletePurchase = async () => {
    if (!selectedPurchase) return;

    setDeletingPurchase(true);
    try {
      // Delete the purchase record using Firebase service
      const deleteResult = await inventoryService.deleteMaterialPurchase(selectedPurchase.id);

      if (deleteResult.success) {
        // Remove the purchased quantity from material inventory
        await inventoryService.updateMaterialStock(
          selectedPurchase.material_type,
          selectedPurchase.quantity,
          "subtract",
          `Removed from deleted purchase: ${selectedPurchase.quantity} ${selectedPurchase.unit}`
        );

        appActions.showNotification(
          `Material purchase deleted successfully. ${selectedPurchase.quantity} ${selectedPurchase.unit} removed from inventory.`,
          'success'
        );
        loadMaterialPurchaseHistory();
        // Trigger inventory refresh using the service's force sync
        inventoryService.forceSyncInventory();
      } else {
        appActions.showNotification('Failed to delete material purchase', 'error');
      }
    } catch (error) {
      console.error('Error deleting material purchase:', error);
      appActions.showNotification('Failed to delete material purchase', 'error');
    } finally {
      setDeletingPurchase(false);
      setDeletePurchaseDialogOpen(false);
      setSelectedPurchase(null);
    }
  };

  // Cancel operations
  const cancelDeletePurchase = () => {
    setDeletePurchaseDialogOpen(false);
    setSelectedPurchase(null);
  };

  const cancelEditPurchase = () => {
    setEditPurchaseDialogOpen(false);
    setSelectedPurchase(null);
    resetEdit();
  };

  // Format date for purchase history
  const formatPurchaseDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get material display info
  const getMaterialInfo = (materialType) => {
    return materialTypes.find(m => m.value === materialType) || 
           { label: materialType, unit: 'units', color: 'default' };
  };

  // Filter data based on material type
  const filteredHistory = materialPurchaseHistory.filter(purchase => 
    filterMaterial === 'all' || purchase.material_type === filterMaterial
  );

  // Get paginated data
  const paginatedHistory = filteredHistory.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate summary statistics
  const summaryStats = materialTypes.reduce((acc, material) => {
    const materialPurchases = materialPurchaseHistory.filter(p => p.material_type === material.value);
    acc[material.value] = {
      totalPurchases: materialPurchases.length,
      totalQuantity: materialPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0),
      totalCost: materialPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0),
    };
    return acc;
  }, {});

  // Public method to refresh data (can be called from parent)
  const refreshData = () => {
    loadMaterialPurchaseHistory();
  };

  return (
    <Box>
      {/* Loading indicator */}
      {purchaseHistoryLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Material</InputLabel>
          <Select
            value={filterMaterial}
            label="Filter by Material"
            onChange={handleFilterChange}
            startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
          >
            <MenuItem value="all">All Materials</MenuItem>
            {materialTypes.map((material) => (
              <MenuItem key={material.value} value={material.value}>
                {material.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Typography variant="body2" color="textSecondary">
          Showing {filteredHistory.length} of {materialPurchaseHistory.length} purchases
        </Typography>
      </Box>

      {/* Purchase History Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Purchase Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Material</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Quantity</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Cost</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {filterMaterial === 'all' 
                      ? 'No material purchase history available'
                      : `No purchases found for ${getMaterialInfo(filterMaterial).label}`
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((purchase, index) => {
                const materialInfo = getMaterialInfo(purchase.material_type);
                return (
                  <TableRow key={purchase.id || index} hover>
                    <TableCell>
                      {formatPurchaseDate(purchase.date || purchase.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={materialInfo.label}
                        color={materialInfo.color}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {purchase.quantity.toLocaleString()} {purchase.unit || materialInfo.unit}
                    </TableCell>
                    <TableCell align="right">
                      ₹{purchase.purchase_rate} per {purchase.unit || materialInfo.unit}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      ₹{purchase.total_cost.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {purchase.supplier || 'Unknown Supplier'}
                    </TableCell>
                    <TableCell>
                      {purchase.notes || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Edit purchase">
                          <IconButton
                            size="small"
                            onClick={() => handleEditPurchase(purchase)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete purchase">
                          <IconButton
                            size="small"
                            onClick={() => handleDeletePurchase(purchase)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.1)
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredHistory.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Purchase Summary by Material */}
      {materialPurchaseHistory.length > 0 && (
        <Card sx={{ mt: 3 }} variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Purchase Summary by Material
            </Typography>
            <Grid container spacing={3}>
              {materialTypes.map((material) => {
                const stats = summaryStats[material.value];
                if (stats.totalPurchases === 0) return null;
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={material.value}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Chip
                          label={material.label}
                          color={material.color}
                          sx={{ mb: 2 }}
                        />
                        <Typography variant="h6" color="primary" gutterBottom>
                          {stats.totalPurchases}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Purchases
                        </Typography>
                        <Typography variant="h6" color="warning.main" gutterBottom>
                          {stats.totalQuantity.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {material.unit}
                        </Typography>
                        <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                          ₹{stats.totalCost.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total spent
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Overall Summary */}
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Purchases
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {materialPurchaseHistory.length}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount Spent
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                      ₹{materialPurchaseHistory.reduce((sum, p) => sum + (p.total_cost || 0), 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Material Types
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      {Object.values(summaryStats).filter(s => s.totalPurchases > 0).length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Edit Material Purchase Dialog */}
      <Dialog
        open={editPurchaseDialogOpen}
        onClose={cancelEditPurchase}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogTitle>Edit Material Purchase</DialogTitle>
          
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="date"
                control={editControl}
                rules={{
                  required: "Purchase date is required",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Purchase Date"
                    type="date"
                    fullWidth
                    error={!!editErrors.date}
                    helperText={editErrors.date?.message}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
              />

              <Controller
                name="materialType"
                control={editControl}
                rules={{ required: "Material type is required" }}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Material Type</InputLabel>
                    <Select {...field} label="Material Type">
                      {materialTypes.map((material) => (
                        <MenuItem key={material.value} value={material.value}>
                          {material.label} ({material.unit})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="quantity"
                control={editControl}
                rules={{ 
                  required: 'Quantity is required',
                  min: { value: 0.01, message: 'Quantity must be greater than 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={`Quantity (${editSelectedMaterial?.unit || 'units'})`}
                    type="number"
                    step="0.01"
                    fullWidth
                    error={!!editErrors.quantity}
                    helperText={editErrors.quantity?.message}
                  />
                )}
              />

              <Controller
                name="purchaseRate"
                control={editControl}
                rules={{ 
                  required: 'Purchase rate is required',
                  min: { value: 0.01, message: 'Rate must be greater than 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={`Rate per ${editSelectedMaterial?.unit} (₹)`}
                    type="number"
                    step="0.01"
                    fullWidth
                    error={!!editErrors.purchaseRate}
                    helperText={editErrors.purchaseRate?.message}
                  />
                )}
              />

              <Controller
                name="supplier"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Supplier Name"
                    fullWidth
                  />
                )}
              />

              <Controller
                name="notes"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes (optional)"
                    multiline
                    rows={3}
                    fullWidth
                  />
                )}
              />

              {/* Total cost display */}
              {editWatch('quantity') && editWatch('purchaseRate') && (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 1,
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.2)
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Updated Total Cost:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ₹{(parseFloat(editWatch('quantity') || 0) * parseFloat(editWatch('purchaseRate') || 0)).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={cancelEditPurchase} disabled={editingPurchase}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={editingPurchase}
              startIcon={editingPurchase ? null : <CheckCircleIcon />}
            >
              {editingPurchase ? 'Updating...' : 'Update Purchase'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Purchase Confirmation Dialog */}
      <Dialog
        open={deletePurchaseDialogOpen}
        onClose={cancelDeletePurchase}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Material Purchase
        </DialogTitle>
        <DialogContent>
          {selectedPurchase && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete this material purchase record?
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  This action will:
                </Typography>
                <Typography variant="body2" component="div">
                  • Remove <strong>{selectedPurchase.quantity} {selectedPurchase.unit || 'units'}</strong> from {getMaterialInfo(selectedPurchase.material_type).label} inventory
                </Typography>
                <Typography variant="body2" component="div">
                  • Delete purchase record of <strong>₹{selectedPurchase.total_cost.toLocaleString()}</strong>
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                  This action cannot be undone.
                </Typography>
              </Alert>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 1,
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.2)
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  Purchase Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatPurchaseDate(selectedPurchase.date || selectedPurchase.timestamp)}
                </Typography>
                <Typography variant="body2">
                  <strong>Material:</strong> {getMaterialInfo(selectedPurchase.material_type).label}
                </Typography>
                <Typography variant="body2">
                  <strong>Quantity:</strong> {selectedPurchase.quantity.toLocaleString()} {selectedPurchase.unit}
                </Typography>
                <Typography variant="body2">
                  <strong>Rate:</strong> ₹{selectedPurchase.purchase_rate} per {selectedPurchase.unit}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Cost:</strong> ₹{selectedPurchase.total_cost.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Supplier:</strong> {selectedPurchase.supplier || 'Unknown'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cancelDeletePurchase} disabled={deletingPurchase}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeletePurchase}
            variant="contained"
            color="error"
            disabled={deletingPurchase}
            startIcon={deletingPurchase ? null : <DeleteIcon />}
          >
            {deletingPurchase ? "Deleting..." : "Delete Purchase"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MaterialPurchaseHistory;