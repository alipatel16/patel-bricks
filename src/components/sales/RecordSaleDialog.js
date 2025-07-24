// components/Sales/RecordSaleDialog.js - Your existing code with minimal edit mode support added
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Autocomplete,
  Divider,
  Chip,
  CircularProgress,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  LocalShipping as VehicleIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Public as StateIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";

import {
  calculateTotalSaleAmount,
  formatCurrency,
  generateCustomerSuggestions,
  generateLocationSuggestions,
} from "../../utils/calculations";
import {
  PAYMENT_METHODS,
  INDIAN_STATES,
} from "../../utils/constants";
import { productionService } from "../../services/productionService";
import { salesService } from "../../services/salesService";
import { dbUtils } from "../../services/firebase"; // NEW: Import for loading vehicles

const RecordSaleDialog = ({
  open,
  onClose,
  onSubmit,
  isLoading,
  bricks,
  customerOptions,
  setCustomerOptions,
  locationOptions,
  setLocationOptions,
  selectedCustomer,
  setSelectedCustomer,
  selectedLocation,
  setSelectedLocation,
  customerSearchLoading,
  setCustomerSearchLoading,
  calculatedAmounts,
  setCalculatedAmounts,
  searchCustomers,
  // ONLY ADDITION: Edit mode props
  editingData,
  isEditMode,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Customer search timeout
  const [customerSearchTimeout, setCustomerSearchTimeout] = useState(null);
  const [calculatedBrickStock, setCalculatedBrickStock] = useState(0);

  // NEW: Vehicle management state
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  // Default form values
  const defaultValues = {
    saleDate: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerState: "GJ",
    customerStateCode: "24",
    customerGSTIN: "",
    locationName: "",
    quantity: "",
    pricePerBrick: 6.15,
    vehicleNumber: "",
    challanNumber: "",
    discount: 0,
    discountType: "amount",
    paymentMethod: "cash",
    notes: "",
    includeGST: false,
  };

  // Form management with reordered fields
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
  });

  const watchCustomerName = watch("customerName");
  const watchLocationName = watch("locationName");
  const watchQuantity = watch("quantity");
  const watchPricePerBrick = watch("pricePerBrick");
  const watchDiscount = watch("discount");
  const watchDiscountType = watch("discountType");
  const watchCustomerState = watch("customerState");
  const watchIncludeGST = watch("includeGST");
  const watchVehicleNumber = watch("vehicleNumber"); // NEW: Watch vehicle number

  // ONLY ADDITION: Handle edit mode - populate form with existing data
  useEffect(() => {
    if (isEditMode && editingData && open) {
      console.log("Setting edit mode data:", editingData);
      
      // Reset form with edit data
      reset({
        saleDate: editingData.saleDate || new Date().toISOString().split("T")[0],
        customerName: editingData.customerName || "",
        customerPhone: editingData.customerPhone || "",
        customerEmail: editingData.customerEmail || "",
        customerState: editingData.customerState || "GJ",
        customerStateCode: editingData.customerStateCode || "24",
        customerGSTIN: editingData.customerGSTIN || "",
        locationName: editingData.locationName || "",
        quantity: editingData.quantity || "",
        pricePerBrick: editingData.pricePerBrick || 6.15,
        vehicleNumber: editingData.vehicleNumber || "",
        challanNumber: editingData.challanNumber || "",
        discount: editingData.discount || 0,
        discountType: editingData.discountType || "amount",
        paymentMethod: editingData.paymentMethod || "cash",
        notes: editingData.notes || "",
        includeGST: editingData.includeGST || false,
      });
    } else if (!isEditMode && open) {
      // Reset to default values for new sale
      reset(defaultValues);
    }
  }, [isEditMode, editingData, open, reset]);

  // NEW: Load vehicles from settings
  const loadVehicleOptions = async () => {
    try {
      setVehicleLoading(true);
      const result = await dbUtils.readData('settings/invoice_config');
      
      if (result.success && result.data && result.data.vehicles) {
        setVehicleOptions(result.data.vehicles);
      } else {
        setVehicleOptions([]);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicleOptions([]);
    } finally {
      setVehicleLoading(false);
    }
  };

  // NEW: Load vehicles on component mount
  useEffect(() => {
    if (open) {
      loadVehicleOptions();
    }
  }, [open]);

  // Handle state change and auto-update state code
  useEffect(() => {
    const selectedState = INDIAN_STATES[watchCustomerState];
    if (selectedState) {
      setValue("customerStateCode", selectedState.code);
    }
  }, [watchCustomerState, setValue]);

  // Function to calculate actual brick stock (enhanced version)
  const calculateActualBrickStock = async () => {
    try {
      // Fetch all required data including manual adjustments
      const [productionResult, salesResult] = await Promise.all([
        productionService.getProductionHistory(1000),
        salesService.getAllSales(),
      ]);

      const totalProduction =
        productionResult.success && productionResult.data
          ? productionResult.data.reduce(
              (sum, prod) => sum + (parseInt(prod.quantity) || 0),
              0
            )
          : 0;

      const totalSales =
        salesResult.success && salesResult.data
          ? salesResult.data.reduce(
              (sum, sale) => sum + (parseInt(sale.quantity) || 0),
              0
            )
          : 0;

      return totalProduction - totalSales;
    } catch (error) {
      console.error("Error calculating brick stock:", error);
      return 0;
    }
  };

  const loadCalculatedBrickStock = async () => {
    const stock = await calculateActualBrickStock();
    setCalculatedBrickStock(stock);
  };

  useEffect(() => {
    loadCalculatedBrickStock();
  }, []);
  
  // Auto-populate customer when typing (debounced)
  useEffect(() => {
    if (customerSearchTimeout) {
      clearTimeout(customerSearchTimeout);
    }

    if (watchCustomerName && watchCustomerName.length >= 2) {
      setCustomerSearchTimeout(
        setTimeout(async () => {
          setCustomerSearchLoading(true);
          try {
            const result = await searchCustomers(watchCustomerName);
            if (result.success) {
              const suggestions = generateCustomerSuggestions(
                result.data,
                watchCustomerName
              );
              setCustomerOptions(suggestions.map((s) => s.customer));
            }
          } catch (error) {
            console.error("Error searching customers:", error);
          } finally {
            setCustomerSearchLoading(false);
          }
        }, 300)
      );
    } else {
      setCustomerOptions([]);
      setSelectedCustomer(null);
      setLocationOptions([]);
      setSelectedLocation(null);
    }

    return () => {
      if (customerSearchTimeout) {
        clearTimeout(customerSearchTimeout);
      }
    };
  }, [
    watchCustomerName,
    searchCustomers,
    setCustomerOptions,
    setSelectedCustomer,
    setLocationOptions,
    setSelectedLocation,
    setCustomerSearchLoading,
  ]);

  // Auto-populate locations when customer is selected and user types location
  useEffect(() => {
    if (selectedCustomer && watchLocationName !== undefined) {
      const suggestions = generateLocationSuggestions(
        selectedCustomer,
        watchLocationName
      );
      setLocationOptions(suggestions.map((s) => s.location));
    }
  }, [selectedCustomer, watchLocationName, setLocationOptions]);

  // Calculate amounts in real-time
  useEffect(() => {
    const quantity = parseInt(watchQuantity) || 0;
    const pricePerBrick = parseFloat(watchPricePerBrick) || 0;
    const discount = parseFloat(watchDiscount) || 0;
    const discountType = watchDiscountType || "amount";
    const customerState = watchCustomerState || "GJ";
    const includeGST = watchIncludeGST || false;

    if (quantity > 0 && pricePerBrick > 0) {
      if (includeGST) {
        // Calculate with GST
        const amounts = calculateTotalSaleAmount(
          quantity,
          pricePerBrick,
          discount,
          discountType,
          customerState,
          "GJ" // Company state
        );
        setCalculatedAmounts(amounts);
      } else {
        // Calculate without GST
        const subtotal = quantity * pricePerBrick;
        let discountAmount = 0;

        if (discountType === "percentage") {
          discountAmount = (subtotal * discount) / 100;
        } else {
          discountAmount = discount;
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        setCalculatedAmounts({
          subtotal,
          discountAmount,
          taxableAmount: totalAmount,
          totalTax: 0,
          totalAmount,
          isInterState: false,
        });
      }
    } else {
      setCalculatedAmounts({
        subtotal: 0,
        discountAmount: 0,
        taxableAmount: 0,
        totalTax: 0,
        totalAmount: 0,
        isInterState: false,
      });
    }
  }, [
    watchQuantity,
    watchPricePerBrick,
    watchDiscount,
    watchDiscountType,
    watchCustomerState,
    watchIncludeGST,
    setCalculatedAmounts,
  ]);

  // Handle customer selection from autocomplete (enhanced for new customers)
  const handleCustomerSelect = (event, value) => {
    if (value && typeof value === "object") {
      // Selected from existing customers
      setSelectedCustomer(value);

      // Auto-populate customer fields
      setValue("customerName", value.name || "");
      setValue("customerPhone", value.phone || "");
      setValue("customerEmail", value.email || "");
      setValue("customerState", value.state || "GJ");
      setValue("customerStateCode", value.state_code || "24");
      setValue("customerGSTIN", value.gstin || "");

      // Clear location selection to let user choose
      setValue("locationName", "");
      setSelectedLocation(null);
      setLocationOptions(value.locations || []);
    } else if (value && typeof value === "string") {
      // Free text entry for new customer
      setSelectedCustomer(null);
      setValue("customerName", value);
      setValue("customerPhone", "");
      setValue("customerEmail", "");
      setValue("customerState", "GJ");
      setValue("customerStateCode", "24");
      setValue("customerGSTIN", "");
      setValue("locationName", "");
      setSelectedLocation(null);
      setLocationOptions([]);
    } else {
      // Clear selection
      setSelectedCustomer(null);
      setLocationOptions([]);
      setSelectedLocation(null);
    }
  };

  // Handle location selection from autocomplete (enhanced for new locations)
  const handleLocationSelect = (event, value) => {
    if (value && typeof value === "object") {
      // Selected from existing locations
      setSelectedLocation(value);
      setValue("locationName", value.name);

      // Set brick rate if available for this location
      if (selectedCustomer?.brick_rates?.[value.id]) {
        setValue("pricePerBrick", selectedCustomer.brick_rates[value.id]);
      }
    } else if (value && typeof value === "string") {
      // Free text entry for new location
      setSelectedLocation(null);
      setValue("locationName", value);
    } else {
      // Clear selection
      setSelectedLocation(null);
      setValue("locationName", "");
    }
  };

  // NEW: Handle vehicle selection from autocomplete
  const handleVehicleSelect = (event, value) => {
    if (value && typeof value === "object") {
      // Selected from existing vehicles
      setValue("vehicleNumber", value.number);
    } else if (value && typeof value === "string") {
      // Free text entry for new vehicle
      setValue("vehicleNumber", value.toUpperCase());
    } else {
      // Clear selection
      setValue("vehicleNumber", "");
    }
  };

  // Handle dialog close
  const handleClose = () => {
    reset(defaultValues);
    setSelectedCustomer(null);
    setSelectedLocation(null);
    setCustomerOptions([]);
    setLocationOptions([]);
    onClose();
  };

  // Enhanced submit handler with auto-reset after successful submission
  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      
      // ONLY MODIFICATION: Don't auto-reset in edit mode
      if (!isEditMode) {
        // Reset the form automatically for next sale after successful submission
        // Small delay to ensure any success messages are shown first
        setTimeout(() => {
          reset(defaultValues);
          setSelectedCustomer(null);
          setSelectedLocation(null);
          setCustomerOptions([]);
          setLocationOptions([]);
          setCalculatedAmounts({
            subtotal: 0,
            discountAmount: 0,
            taxableAmount: 0,
            totalTax: 0,
            totalAmount: 0,
            isInterState: false,
          });
        }, 1000); // Increased delay to ensure success toast is visible
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      // Don't reset on error, let user see the error and fix it
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ShoppingCartIcon sx={{ mr: 2 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {/* ONLY MODIFICATION: Change title based on edit mode */}
              {isEditMode ? "Edit Sale" : "Record New Sale"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode ? "Update the sale details below" : "Fill in the details below to record a new sale"}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={4} sx={{ mt: 1 }}>
            {/* Date Selection - First and Prominent */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="saleDate"
                        control={control}
                        rules={{ required: "Sale date is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Sale Date"
                            type="date"
                            fullWidth
                            required
                            error={!!errors.saleDate}
                            helperText={errors.saleDate?.message}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarIcon color="primary" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    {calculatedAmounts.totalAmount > 0 && (
                      <Grid item xs={12} md={6}>
                        <Box textAlign="right">
                          <Typography
                            variant="h4"
                            color="success.main"
                            fontWeight="bold"
                          >
                            {formatCurrency(calculatedAmounts.totalAmount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Amount (
                            {watchIncludeGST ? "incl. GST" : "excl. GST"})
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Divider sx={{ width: "100%", my: 2 }} />

            {/* Customer Information - Moved up */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                color="primary"
                fontWeight="bold"
              >
                <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Customer Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={customerOptions}
                getOptionLabel={(option) => `${option.name} (${option.phone})`}
                onChange={handleCustomerSelect}
                loading={customerSearchLoading}
                freeSolo
                value={selectedCustomer} // Ensure controlled value
                inputValue={watchCustomerName} // Ensure controlled input
                renderInput={(params) => (
                  <Controller
                    name="customerName"
                    control={control}
                    rules={{ required: "Customer name is required" }}
                    render={({ field }) => (
                      <TextField
                        {...params}
                        {...field}
                        label="Customer Name"
                        fullWidth
                        required
                        error={!!errors.customerName}
                        helperText={
                          errors.customerName?.message ||
                          "Type name to search existing customers or add new"
                        }
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon color="primary" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {customerSearchLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="customerPhone"
                control={control}
                rules={{ required: "Phone number is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    fullWidth
                    required
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="customerEmail"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email (Optional)"
                    type="email"
                    fullWidth
                    error={!!errors.customerEmail}
                    helperText={errors.customerEmail?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Location Field - Editable */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={locationOptions}
                getOptionLabel={(option) =>
                  `${option.name} - ${option.address}`
                }
                onChange={handleLocationSelect}
                freeSolo
                value={selectedLocation} // Ensure controlled value
                inputValue={watchLocationName} // Ensure controlled input
                disabled={!watchCustomerName || watchCustomerName.length < 2}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2">
                        {option.name}
                        {selectedCustomer?.brick_rates?.[option.id] && (
                          <Chip
                            label={`₹${
                              selectedCustomer.brick_rates[option.id]
                            }/brick`}
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.address}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <Controller
                    name="locationName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...params}
                        {...field}
                        label="Location/Site"
                        fullWidth
                        error={!!errors.locationName}
                        helperText={
                          errors.locationName?.message ||
                          (watchCustomerName && watchCustomerName.length >= 2
                            ? "Type location name or select from existing"
                            : "Enter customer name first")
                        }
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* State and State Code Fields */}
            <Grid item xs={12} md={6}>
              <Controller
                name="customerState"
                control={control}
                rules={{ required: "State is required" }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.customerState}>
                    <InputLabel>Customer State</InputLabel>
                    <Select
                      {...field}
                      label="Customer State"
                      startAdornment={
                        <InputAdornment position="start">
                          <StateIcon color="primary" />
                        </InputAdornment>
                      }
                    >
                      {Object.entries(INDIAN_STATES).map(([code, state]) => (
                        <MenuItem key={code} value={code}>
                          {state.name} ({code})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customerState && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                        {errors.customerState.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="customerStateCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="State Code"
                    fullWidth
                    disabled
                    helperText="Auto-populated based on selected state"
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                )}
              />
            </Grid>

            {watchIncludeGST && <Grid item xs={12} md={6}>
              <Controller
                name="customerGSTIN"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="GSTIN (Optional)"
                    fullWidth
                    placeholder="e.g., 24BLLPP8863R1ZX"
                    error={!!errors.customerGSTIN}
                    helperText={errors.customerGSTIN?.message || "15-character GSTIN number"}
                    inputProps={{ maxLength: 15 }}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                )}
              />
            </Grid>}

            <Divider sx={{ width: "100%", my: 2 }} />

            {/* Product Information - Moved down */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                color="primary"
                fontWeight="bold"
              >
                <MoneyIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Product Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
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
                    label="Quantity (Bricks)"
                    type="number"
                    fullWidth
                    required
                    error={!!errors.quantity}
                    helperText={
                      errors.quantity?.message ||
                      `Available: ${calculatedBrickStock.toLocaleString()}`
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="pricePerBrick"
                control={control}
                rules={{
                  required: "Price per brick is required",
                  min: {
                    value: 0.01,
                    message: "Price must be greater than 0",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Price per Brick"
                    type="number"
                    step="0.01"
                    fullWidth
                    required
                    error={!!errors.pricePerBrick}
                    helperText={
                      errors.pricePerBrick?.message ||
                      (selectedLocation ? "Rate set from location" : "")
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Divider sx={{ width: "100%", my: 2 }} />

            {/* Transport Information */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                color="primary"
                fontWeight="bold"
              >
                <VehicleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Transport Information
              </Typography>
            </Grid>

            {/* ENHANCED: Vehicle Number with Autocomplete */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={vehicleOptions}
                getOptionLabel={(option) => option.number || option}
                onChange={handleVehicleSelect}
                loading={vehicleLoading}
                freeSolo
                inputValue={watchVehicleNumber}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {option.number}
                      </Typography>
                      {option.driver && (
                        <Typography variant="caption" color="text.secondary">
                          Driver: {option.driver}
                        </Typography>
                      )}
                      {option.capacity && (
                        <Typography variant="caption" color="text.secondary">
                          Capacity: {option.capacity} tons
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <Controller
                    name="vehicleNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...params}
                        {...field}
                        label="Vehicle Number"
                        fullWidth
                        placeholder="e.g., GJ01AB1234"
                        error={!!errors.vehicleNumber}
                        helperText={
                          errors.vehicleNumber?.message ||
                          "Type to search vehicles or enter new number"
                        }
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <VehicleIcon color="primary" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {vehicleLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="challanNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Challan/Receipt Number"
                    fullWidth
                    placeholder="e.g., CH-001"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ReceiptIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Amount Calculation Display */}
            {calculatedAmounts.totalAmount > 0 && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      color="success.main"
                      fontWeight="bold"
                    >
                      Amount Calculation
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Subtotal
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {formatCurrency(calculatedAmounts.subtotal)}
                        </Typography>
                      </Grid>
                      {calculatedAmounts.discountAmount > 0 && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Discount
                          </Typography>
                          <Typography
                            variant="h6"
                            color="error.main"
                            fontWeight="bold"
                          >
                            -{formatCurrency(calculatedAmounts.discountAmount)}
                          </Typography>
                        </Grid>
                      )}
                      {watchIncludeGST && calculatedAmounts.totalTax > 0 && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            {calculatedAmounts.isInterState
                              ? "IGST (12%)"
                              : "CGST+SGST (12%)"}
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {formatCurrency(calculatedAmounts.totalTax)}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Total Amount{" "}
                          {watchIncludeGST ? "(incl. GST)" : "(excl. GST)"}
                        </Typography>
                        <Typography
                          variant="h6"
                          color="success.main"
                          fontWeight="bold"
                        >
                          {formatCurrency(calculatedAmounts.totalAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Divider sx={{ width: "100%", my: 2 }} />

            {/* Payment Information */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                color="primary"
                fontWeight="bold"
              >
                Payment & Notes
              </Typography>
            </Grid>

            {/* GST Toggle */}
            <Grid item xs={12}>
              <Controller
                name="includeGST"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          Include GST in calculation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Toggle to add/remove GST (12%) from the total amount
                        </Typography>
                      </Box>
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select {...field} label="Payment Method">
                      {Object.values(PAYMENT_METHODS).map((method) => (
                        <MenuItem key={method.id} value={method.id}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="discount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Discount"
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="discountType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Discount Type</InputLabel>
                    <Select {...field} label="Discount Type">
                      <MenuItem value="amount">Amount (₹)</MenuItem>
                      <MenuItem value="percentage">Percentage (%)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes (Optional)"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Additional notes about this sale..."
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          size="large"
          disabled={isSubmitting || calculatedAmounts.totalAmount === 0}
          startIcon={
            isSubmitting ? <CircularProgress size={20} /> : <ShoppingCartIcon />
          }
        >
          {/* ONLY MODIFICATION: Change button text based on edit mode */}
          {isSubmitting 
            ? (isEditMode ? "Updating..." : "Recording...") 
            : (isEditMode ? "Update Sale" : "Record Sale")
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordSaleDialog;