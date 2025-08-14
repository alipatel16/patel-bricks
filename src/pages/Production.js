import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
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
  useTheme,
  alpha,
  Pagination,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add as AddIcon,
  Factory as FactoryIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  LocalShipping as TruckIcon,
  Calculate as CalculateIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";

// Import contexts
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";

// Import services
import { productionService } from "../services/productionService";
import { inventoryService } from "../services/inventoryService";

// Import utilities
import {
  calculateCementNeeded,
  validateProductionCapacity,
} from "../utils/calculations";
import { PRODUCTION_SHIFTS } from "../utils/constants";

function Production() {
  const theme = useTheme();
  const { actions: appActions, settings } = useApp();
  const { cement, actions: inventoryActions } = useInventory();

  // State management
  const [productionData, setProductionData] = useState({
    history: [],
    todayProduction: null,
    stats: null,
    loading: false,
    error: null,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // New state for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productionToDelete, setProductionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // New state for auto-calculation toggle
  const [autoCalculateCement, setAutoCalculateCement] = useState(false);

  // Pagination state for production history
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form management
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0], // Today's date
      quantity: "",
      shift: "morning",
      notes: "",
      overrideCement: false,
      cementUsed: "",
    },
  });

  const watchQuantity = watch("quantity");
  const watchOverrideCement = watch("overrideCement");
  const watchDate = watch("date");

  // Load production data on mount
  useEffect(() => {
    loadProductionData();
  }, []);

  // Calculate cement needed when quantity changes (only if auto-calculation is enabled)
  useEffect(() => {
    if (watchQuantity && autoCalculateCement && !watchOverrideCement) {
      const cementNeeded = calculateCementNeeded(
        parseInt(watchQuantity) || 0,
        settings.cement_per_brick_ratio || 0.05
      );
      setValue("cementUsed", cementNeeded);
    }
  }, [
    watchQuantity,
    autoCalculateCement,
    watchOverrideCement,
    settings.cement_per_brick_ratio,
    setValue,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(productionData.history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = productionData.history.slice(startIndex, endIndex);

  // Handle pagination change
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Load all production data
  const loadProductionData = async () => {
    try {
      setProductionData((prev) => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split("T")[0];

      const [historyResult, todayResult, statsResult] = await Promise.all([
        productionService.getProductionHistory(30),
        productionService.getProductionByDate(today),
        productionService.getProductionStats("month"),
      ]);

      setProductionData({
        history: historyResult.success ? historyResult.data : [],
        todayProduction: todayResult.success ? todayResult.data : null,
        stats: statsResult.success ? statsResult.data : null,
        loading: false,
        error: null,
      });
    } catch (error) {
      
      setProductionData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load production data",
      }));
      appActions.showNotification("Failed to load production data", "error");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProductionData();
      appActions.showNotification("Production data refreshed", "success");
    } catch (error) {
      
      appActions.showNotification("Failed to refresh production data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle auto-calculate cement
  const handleAutoCalculateCement = () => {
    const quantity = parseInt(watch("quantity")) || 0;
    if (quantity > 0) {
      const cementNeeded = calculateCementNeeded(
        quantity,
        settings.cement_per_brick_ratio || 0.05
      );
      setValue("cementUsed", cementNeeded);
      appActions.showNotification("Cement calculated automatically", "info");
    } else {
      appActions.showNotification("Please enter quantity first", "warning");
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      
      
      
      // Manual validation for cement
      const cementUsed = parseFloat(data.cementUsed);
      
      
      
      // Additional validation: Check if cement object exists
      if (!cement || cement.total_bags === undefined || cement.total_bags === null) {
        
        alert("Cement inventory data not available. Please refresh the page.");
        appActions.showNotification("Cement inventory data not available. Please refresh the page.", "error");
        return;
      }
      
      // if (!cementUsed || cementUsed <= 0) {
        
      //   alert("Please enter a valid cement amount");
      //   appActions.showNotification("Please enter a valid cement amount", "error");
      //   return;
      // }

      // For updates, we need to check available cement + current production's cement
      const availableCement = editingProduction 
        ? cement.total_bags + editingProduction.cement_used // Add back current production's cement
        : cement.total_bags;

      if (cementUsed > availableCement) {
        
        const errorMessage = `Insufficient cement. Required: ${cementUsed} bags, Available: ${availableCement} bags`;
        alert(errorMessage);
        appActions.showNotification(errorMessage, "error");
        return;
      }

      const productionData = {
        date: data.date, // Pass the selected date
        quantity: parseInt(data.quantity),
        cementUsed: cementUsed,
        shift: data.shift,
        notes: data.notes,
        overrideCementCalculation: true, // Always manual now
      };

      

      let result;
      
      // Check if we're editing or adding new production
      if (editingProduction) {
        // UPDATE existing production
        result = await productionService.updateProduction(editingProduction.date, productionData);
        
        if (result.success) {
          appActions.showNotification(
            "Production updated successfully",
            "success"
          );
        }
      } else {
        // ADD new production
        result = await productionService.addProduction(productionData);
        
        if (result.success) {
          appActions.showNotification(
            "Production recorded successfully",
            "success"
          );
        }
      }

      if (result.success) {
        reset({
          date: new Date().toISOString().split('T')[0], // Reset to today
          quantity: "",
          shift: "morning",
          notes: "",
          overrideCement: false,
          cementUsed: "",
        });
        setDialogOpen(false);
        setEditingProduction(null); // Clear editing state
        loadProductionData();
        inventoryActions.refreshInventory();
      } else {
        
        alert("Error: " + (result.error || "Failed to save production"));
        appActions.showNotification(
          result.error || "Failed to save production",
          "error"
        );
      }
    } catch (error) {
      
      alert("Error: Failed to save production");
      appActions.showNotification("Failed to save production", "error");
    }
  };

  // Handle edit production
  const handleEditProduction = (production) => {
    setEditingProduction(production);
    setValue("date", production.date);
    setValue("quantity", production.quantity);
    setValue("cementUsed", production.cement_used);
    setValue("shift", production.shift);
    setValue("notes", production.notes || "");
    setDialogOpen(true);
  };

  // NEW: Handle delete production
  const handleDeleteProduction = (production) => {
    setProductionToDelete(production);
    setDeleteDialogOpen(true);
  };

  // NEW: Confirm delete production
  const confirmDeleteProduction = async () => {
    if (!productionToDelete) return;

    setDeleting(true);
    try {
      // First, get the production data to understand inventory impact
      const { date, quantity, cement_used } = productionToDelete;

      // Delete the production record
      const deleteResult = await productionService.deleteProduction(date);

      if (deleteResult.success) {
        // Reverse the inventory changes:
        // 1. Subtract bricks from stock (since we're removing production)
        // 2. Add cement back to stock (since we're returning unused cement)
        
        const [brickUpdateResult, cementUpdateResult] = await Promise.all([
          inventoryService.updateBrickStock(
            quantity,
            "subtract", // Remove bricks that were produced
            `Deleted production: ${quantity} bricks on ${date}`
          ),
          inventoryService.updateCementStock(
            cement_used,
            "add", // Add cement back to stock
            null,
            `Returned cement from deleted production on ${date}`
          )
        ]);

        if (brickUpdateResult.success && cementUpdateResult.success) {
          appActions.showNotification(
            `Production deleted successfully. ${quantity} bricks removed from stock, ${cement_used} bags returned to cement inventory.`,
            "success"
          );
        } else {
          appActions.showNotification(
            "Production deleted but inventory update failed. Please check inventory manually.",
            "warning"
          );
        }

        // Reload data and refresh inventory
        loadProductionData();
        inventoryActions.refreshInventory();
        
      } else {
        appActions.showNotification(
          deleteResult.error || "Failed to delete production",
          "error"
        );
      }
    } catch (error) {
      console.error('Error deleting production:', error);
      appActions.showNotification("Failed to delete production", "error");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProductionToDelete(null);
    }
  };

  // NEW: Cancel delete
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setProductionToDelete(null);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduction(null);
    setAutoCalculateCement(false);
    reset({
      date: new Date().toISOString().split('T')[0], // Reset to today
      quantity: "",
      shift: "morning",
      notes: "",
      overrideCement: false,
      cementUsed: "",
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Box>
      {/* Header - Consistent with other pages */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Production Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Track daily brick production and manage manufacturing operations.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh production data">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Record Production
          </Button>
        </Box>
      </Box>

      {/* Loading indicator */}
      {(productionData.loading || refreshing) && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error alert */}
      {productionData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {productionData.error}
        </Alert>
      )}

      {/* Stats Cards - Consistent Design with Fixed Heights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Today's Production */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Today's Production
                  </Typography>
                  <Typography variant="h5" component="div">
                    {productionData.todayProduction?.quantity?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks produced today
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  <FactoryIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Stats */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Monthly Production
                  </Typography>
                  <Typography variant="h5" component="div">
                    {productionData.stats?.total_quantity?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total bricks this month
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                  }}
                >
                  <TrendingUpIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cement Status */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "100px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Cement Available
                  </Typography>
                  <Typography variant="h5" component="div">
                    {cement.total_bags}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bags in stock
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                  }}
                >
                  <TruckIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Info Cards */}
      {productionData.todayProduction && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Today's Production Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Cement Used
                      </Typography>
                      <Typography variant="h6">
                        {productionData.todayProduction.cement_used} bags
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Production Efficiency
                      </Typography>
                      <Typography variant="h6">
                        {productionData.todayProduction.efficiency}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Shift
                      </Typography>
                      <Typography variant="h6">
                        {PRODUCTION_SHIFTS[productionData.todayProduction.shift]?.label || 
                         productionData.todayProduction.shift}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Low Cement Alert */}
      {cement.total_bags < 10 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Low Cement Stock Alert
          </Typography>
          <Typography variant="body2">
            Only {cement.total_bags} bags of cement remaining. Consider purchasing more cement to avoid production interruptions.
          </Typography>
        </Alert>
      )}

      {/* Production History */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Production History ({productionData.history.length})
            </Typography>
            <Tooltip title="Refresh data">
              <IconButton onClick={loadProductionData}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>Quantity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>Cement Used</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Shift</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>Efficiency</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productionData.history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No production history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistory.map((production) => (
                    <TableRow key={production.date} hover>
                      <TableCell>{formatDate(production.date)}</TableCell>
                      <TableCell align="right">
                        {production.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {production.cement_used} bags
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            PRODUCTION_SHIFTS[production.shift]?.label ||
                            production.shift
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {production.efficiency}%
                      </TableCell>
                      <TableCell>{production.notes || "-"}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent : 'center' }}>
                          <Tooltip title="Edit production">
                            <IconButton
                              size="small"
                              onClick={() => handleEditProduction(production)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete production">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteProduction(production)}
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
          </TableContainer>

          {/* Pagination Controls */}
          {productionData.history.length > 0 && (
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
                  Showing {startIndex + 1}-{Math.min(endIndex, productionData.history.length)} of {productionData.history.length} records
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
      </Card>

      {/* Production Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingProduction ? "Update Production" : "Record Production"}
          </DialogTitle>

          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              {/* Date Field */}
              <Controller
                name="date"
                control={control}
                rules={{
                  required: "Date is required",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Production Date"
                    type="date"
                    fullWidth
                    error={!!errors.date}
                    helperText={errors.date?.message}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
              />

              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: "Quantity is required",
                  min: { value: 1, message: "Quantity must be at least 1" },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Brick Quantity"
                    type="number"
                    fullWidth
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                  />
                )}
              />

              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                <Controller
                  name="cementUsed"
                  control={control}
                  rules={{
                    required: "Cement amount is required",
                    min: {
                      value: 0,
                      message: "Cement amount cannot be negative",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Cement Used (bags)"
                      type="number"
                      fullWidth
                      error={!!errors.cementUsed}
                      helperText={
                        errors.cementUsed?.message ||
                        `Available: ${cement.total_bags} bags`
                      }
                    />
                  )}
                />
              </Box>

              <Controller
                name="shift"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Production Shift</InputLabel>
                    <Select {...field} label="Production Shift">
                      {Object.entries(PRODUCTION_SHIFTS).map(([key, shift]) => (
                        <MenuItem key={key} value={key}>
                          {shift.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="notes"
                control={control}
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
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? null : <CheckCircleIcon />}
            >
              {isSubmitting 
                ? (editingProduction ? "Updating..." : "Recording...") 
                : (editingProduction ? "Update Production" : "Record Production")
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* NEW: Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Production Record
        </DialogTitle>
        <DialogContent>
          {productionToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete this production record?
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  This action will:
                </Typography>
                <Typography variant="body2" component="div">
                  • Remove <strong>{productionToDelete.quantity.toLocaleString()} bricks</strong> from stock
                </Typography>
                <Typography variant="body2" component="div">
                  • Return <strong>{productionToDelete.cement_used} bags</strong> to cement inventory
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
                  Production Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(productionToDelete.date)}
                </Typography>
                <Typography variant="body2">
                  <strong>Quantity:</strong> {productionToDelete.quantity.toLocaleString()} bricks
                </Typography>
                <Typography variant="body2">
                  <strong>Cement Used:</strong> {productionToDelete.cement_used} bags
                </Typography>
                <Typography variant="body2">
                  <strong>Shift:</strong> {PRODUCTION_SHIFTS[productionToDelete.shift]?.label || productionToDelete.shift}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cancelDelete} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteProduction}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? null : <DeleteIcon />}
          >
            {deleting ? "Deleting..." : "Delete Production"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Production;