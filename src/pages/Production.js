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
      shift: "morning", // This now matches the constants key
      // quality: 'B', // REMOVED - no longer needed
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
        quality: data.quality,
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
    setValue("quality", production.quality);
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            Production Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Track daily brick production and manage manufacturing operations
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Record Production
        </Button>
      </Box>

      {/* Loading indicator */}
      {productionData.loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error alert */}
      {productionData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {productionData.error}
        </Alert>
      )}

      {/* Today's Production Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography variant="h6" color="primary">
                  Today's Production
                </Typography>
                <FactoryIcon color="primary" />
              </Box>

              {productionData.todayProduction ? (
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    {productionData.todayProduction.quantity.toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Bricks produced
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}
                  >
                    <Chip
                      label={`${productionData.todayProduction.cement_used} bags cement`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${productionData.todayProduction.efficiency}% efficiency`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    0
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    No production recorded today
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setDialogOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Record Production
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography variant="h6" color="secondary">
                  Monthly Stats
                </Typography>
                <TrendingUpIcon color="secondary" />
              </Box>

              {productionData.stats ? (
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    {productionData.stats.total_quantity.toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Total bricks this month
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}
                  >
                    <Chip
                      label={`${productionData.stats.production_days} days`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${productionData.stats.average_daily_production}/day avg`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Loading stats...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography variant="h6" color="warning.main">
                  Cement Status
                </Typography>
                <WarningIcon color="warning" />
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {cement.total_bags}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Bags available
              </Typography>

              {cement.total_bags < 10 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Low cement stock!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
              Production History
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
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Cement Used</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell align="right">Efficiency</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productionData.history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No production history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  productionData.history.map((production) => (
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
                      <TableCell>
                        <Chip
                          label={`Grade ${production.quality}`}
                          size="small"
                          color={
                            production.quality === "A" ? "success" : "default"
                          }
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

              {/* <Controller
                name="quality"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Quality Grade</InputLabel>
                    <Select {...field} label="Quality Grade">
                      {Object.entries(QUALITY_GRADES).map(([key, grade]) => (
                        <MenuItem key={key} value={key}>
                          {grade.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              /> */}

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
