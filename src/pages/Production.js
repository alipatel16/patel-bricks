import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Factory as FactoryIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  LocalShipping as TruckIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";

// Import contexts
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";

// Import services
import { productionService } from "../services/productionService";

// Import utilities
import {
  calculateCementNeeded,
  validateProductionCapacity,
} from "../utils/calculations";
import { PRODUCTION_SHIFTS, QUALITY_GRADES } from "../utils/constants";

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
      quantity: "",
      shift: "morning",
      notes: "",
      overrideCement: false,
      cementUsed: "",
    },
  });

  const watchQuantity = watch("quantity");
  const watchOverrideCement = watch("overrideCement");

  // Load production data on mount
  useEffect(() => {
    loadProductionData();
  }, []);

  // Calculate cement needed when quantity changes
  useEffect(() => {
    if (watchQuantity && !watchOverrideCement) {
      const cementNeeded = calculateCementNeeded(
        parseInt(watchQuantity) || 0,
        settings.cement_per_brick_ratio || 0.05
      );
      setValue("cementUsed", cementNeeded);
    }
  }, [
    watchQuantity,
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
      console.error("Error loading production data:", error);
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
      console.error("Error refreshing production data:", error);
      appActions.showNotification("Failed to refresh production data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Validate cement capacity
      const capacity = validateProductionCapacity(
        parseInt(data.quantity),
        cement.total_bags,
        settings.cement_per_brick_ratio || 0.05
      );

      if (!capacity.isValid) {
        appActions.showNotification(
          `Insufficient cement. Required: ${capacity.requiredCement} bags, Available: ${capacity.availableCement} bags`,
          "error"
        );
        return;
      }

      const productionData = {
        quantity: parseInt(data.quantity),
        cementUsed: parseFloat(data.cementUsed),
        shift: data.shift,
        notes: data.notes,
        overrideCementCalculation: data.overrideCement,
      };

      const result = await productionService.addProduction(productionData);

      if (result.success) {
        appActions.showNotification(
          "Production recorded successfully",
          "success"
        );
        reset();
        setDialogOpen(false);
        loadProductionData();
        inventoryActions.refreshInventory();
      } else {
        appActions.showNotification(
          result.error || "Failed to record production",
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting production:", error);
      appActions.showNotification("Failed to record production", "error");
    }
  };

  // Handle edit production
  const handleEditProduction = (production) => {
    setEditingProduction(production);
    setValue("quantity", production.quantity);
    setValue("cementUsed", production.cement_used);
    setValue("shift", production.shift);
    setValue("notes", production.notes || "");
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduction(null);
    reset();
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
                        <Tooltip title="Edit production">
                          <IconButton
                            size="small"
                            onClick={() => handleEditProduction(production)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
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
            {editingProduction ? "Edit Production" : "Record Production"}
          </DialogTitle>

          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
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
              {isSubmitting ? "Recording..." : "Record Production"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Production;