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
  useTheme,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Import contexts and services
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { inventoryService } from '../../services/inventoryService';

function CementPurchaseHistory() {
  const theme = useTheme();
  const { actions: appActions } = useApp();
  const { actions: inventoryActions } = useInventory();

  // Purchase history state
  const [cementPurchaseHistory, setCementPurchaseHistory] = useState([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    formState: { errors: editErrors, isSubmitting: isEditSubmitting }
  } = useForm({
    defaultValues: {
      date: '',
      bags: '',
      costPerBag: '',
      supplier: '',
      notes: '',
    }
  });

  // Load cement purchase history
  const loadCementPurchaseHistory = async () => {
    try {
      setPurchaseHistoryLoading(true);
      const result = await inventoryService.getCementPurchaseHistory(1000); // Get more records for pagination
      
      if (result.success) {
        setCementPurchaseHistory(result.data || []);
      } else {
        console.error('Failed to load cement purchase history:', result.error);
        setCementPurchaseHistory([]);
      }
    } catch (error) {
      console.error('Error loading cement purchase history:', error);
      setCementPurchaseHistory([]);
    } finally {
      setPurchaseHistoryLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadCementPurchaseHistory();
  }, []);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle edit purchase
  const handleEditPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    resetEdit({
      date: purchase.date || new Date(purchase.timestamp).toISOString().split('T')[0],
      bags: purchase.bags,
      costPerBag: purchase.cost_per_bag,
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
      const originalBags = selectedPurchase.bags;
      const newBags = parseInt(data.bags);
      const bagsDifference = newBags - originalBags;

      // Update the purchase record
      const updateResult = await inventoryService.updateCementPurchase(selectedPurchase.id, {
        date: data.date,
        bags: newBags,
        cost_per_bag: parseFloat(data.costPerBag),
        total_cost: newBags * parseFloat(data.costPerBag),
        supplier: data.supplier,
        notes: data.notes,
      });

      if (updateResult.success) {
        // Adjust cement inventory based on the difference
        if (bagsDifference !== 0) {
          const operation = bagsDifference > 0 ? "add" : "subtract";
          const amount = Math.abs(bagsDifference);
          
          await inventoryService.updateCementStock(
            amount,
            operation,
            parseFloat(data.costPerBag),
            `Adjusted from edited purchase: ${bagsDifference > 0 ? '+' : '-'}${amount} bags`
          );
        }

        appActions.showNotification('Purchase updated successfully', 'success');
        loadCementPurchaseHistory();
        inventoryActions.refreshInventory();
        setEditPurchaseDialogOpen(false);
        setSelectedPurchase(null);
      } else {
        appActions.showNotification('Failed to update purchase', 'error');
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      appActions.showNotification('Failed to update purchase', 'error');
    } finally {
      setEditingPurchase(false);
    }
  };

  // Confirm delete purchase
  const confirmDeletePurchase = async () => {
    if (!selectedPurchase) return;

    setDeletingPurchase(true);
    try {
      // Delete the purchase record
      const deleteResult = await inventoryService.deleteCementPurchase(selectedPurchase.id);

      if (deleteResult.success) {
        // Remove the purchased bags from cement inventory
        await inventoryService.updateCementStock(
          selectedPurchase.bags,
          "subtract",
          null,
          `Removed from deleted purchase: ${selectedPurchase.bags} bags`
        );

        appActions.showNotification(
          `Purchase deleted successfully. ${selectedPurchase.bags} bags removed from inventory.`,
          'success'
        );
        loadCementPurchaseHistory();
        inventoryActions.refreshInventory();
      } else {
        appActions.showNotification('Failed to delete purchase', 'error');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      appActions.showNotification('Failed to delete purchase', 'error');
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

  // Get paginated data
  const paginatedHistory = cementPurchaseHistory.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Public method to refresh data (can be called from parent)
  const refreshData = () => {
    loadCementPurchaseHistory();
  };

  return (
    <Box>
      {/* Loading indicator */}
      {purchaseHistoryLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Purchase History Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Purchase Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Bags</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Cost per Bag</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Cost</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    No cement purchase history available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((purchase, index) => (
                <TableRow key={purchase.id || index} hover>
                  <TableCell>
                    {formatPurchaseDate(purchase.date || purchase.timestamp)}
                  </TableCell>
                  <TableCell align="right">
                    {purchase.bags.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ₹{purchase.cost_per_bag}
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
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={cementPurchaseHistory.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Purchase Summary */}
      {cementPurchaseHistory.length > 0 && (
        <Card sx={{ mt: 3 }} variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Purchase Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Purchases
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {cementPurchaseHistory.length}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Bags Purchased
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {cementPurchaseHistory.reduce((sum, p) => sum + (p.bags || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount Spent
                  </Typography>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    ₹{cementPurchaseHistory.reduce((sum, p) => sum + (p.total_cost || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Edit Purchase Dialog */}
      <Dialog
        open={editPurchaseDialogOpen}
        onClose={cancelEditPurchase}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogTitle>Edit Cement Purchase</DialogTitle>
          
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
                name="bags"
                control={editControl}
                rules={{ 
                  required: 'Bags is required',
                  min: { value: 1, message: 'Bags must be at least 1' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Bags Purchased"
                    type="number"
                    fullWidth
                    error={!!editErrors.bags}
                    helperText={editErrors.bags?.message}
                  />
                )}
              />

              <Controller
                name="costPerBag"
                control={editControl}
                rules={{ 
                  required: 'Cost per bag is required',
                  min: { value: 0.01, message: 'Cost must be greater than 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Cost per Bag (₹)"
                    type="number"
                    step="0.01"
                    fullWidth
                    error={!!editErrors.costPerBag}
                    helperText={editErrors.costPerBag?.message}
                  />
                )}
              />

              <Controller
                name="supplier"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Supplier (optional)"
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
          Delete Cement Purchase
        </DialogTitle>
        <DialogContent>
          {selectedPurchase && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete this cement purchase record?
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  This action will:
                </Typography>
                <Typography variant="body2" component="div">
                  • Remove <strong>{selectedPurchase.bags} bags</strong> from cement inventory
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
                  <strong>Bags:</strong> {selectedPurchase.bags.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Cost per Bag:</strong> ₹{selectedPurchase.cost_per_bag}
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

// Export both the component and the refresh function
export default CementPurchaseHistory;