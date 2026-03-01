// components/Sales/RecordSaleDialog.js - FIXED: Auto-populate location in edit mode + customer search in edit mode
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
import { customerService } from "../../services/customerService";
import { dbUtils } from "../../services/firebase";

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
  editingData,
  isEditMode,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [customerSearchTimeout, setCustomerSearchTimeout] = useState(null);
  const [calculatedBrickStock, setCalculatedBrickStock] = useState(0);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);

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

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  const watchCustomerName = watch("customerName");
  const watchLocationName = watch("locationName");
  const watchQuantity = watch("quantity");
  const watchPricePerBrick = watch("pricePerBrick");
  const watchDiscount = watch("discount");
  const watchDiscountType = watch("discountType");
  const watchCustomerState = watch("customerState");
  const watchIncludeGST = watch("includeGST");
  const watchVehicleNumber = watch("vehicleNumber");

  // Handle edit mode - pre-populate form
  useEffect(() => {
    if (isEditMode && editingData && open) {
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

      const loadCustomerDataForEdit = async () => {
        if (editingData.originalSale && editingData.originalSale.customer_phone) {
          try {
            const customerResult = await customerService.getCustomerById(editingData.originalSale.customer_phone);

            if (customerResult.success && customerResult.data) {
              const fullCustomerData = customerResult.data;
              setSelectedCustomer(fullCustomerData);

              if (fullCustomerData.locations && fullCustomerData.locations.length > 0) {
                setLocationOptions(fullCustomerData.locations);

                const matchingLocation = fullCustomerData.locations.find(
                  loc => loc.name === editingData.locationName
                );

                if (matchingLocation) {
                  setSelectedLocation(matchingLocation);
                } else {
                  const tempLocation = {
                    id: 'temp_location',
                    name: editingData.locationName || '',
                    address: editingData.originalSale.customer_address || ''
                  };
                  setSelectedLocation(tempLocation);
                }
              } else {
                if (editingData.locationName) {
                  const tempLocation = {
                    id: 'temp_location',
                    name: editingData.locationName,
                    address: editingData.originalSale.customer_address || ''
                  };
                  setLocationOptions([tempLocation]);
                  setSelectedLocation(tempLocation);
                }
              }
            } else {
              const customerFromSale = {
                name: editingData.customerName,
                phone: editingData.customerPhone,
                email: editingData.customerEmail,
                state: editingData.customerState,
                state_code: editingData.customerStateCode,
                gstin: editingData.customerGSTIN,
                locations: editingData.locationName ? [{
                  id: 'temp_location',
                  name: editingData.locationName,
                  address: editingData.originalSale?.customer_address || editingData.locationName
                }] : []
              };

              setSelectedCustomer(customerFromSale);

              if (editingData.locationName) {
                const tempLocation = {
                  id: 'temp_location',
                  name: editingData.locationName,
                  address: editingData.originalSale?.customer_address || editingData.locationName
                };
                setLocationOptions([tempLocation]);
                setSelectedLocation(tempLocation);
              }
            }
          } catch (error) {
            console.error('Error loading customer data for edit:', error);
            const customerFromSale = {
              name: editingData.customerName,
              phone: editingData.customerPhone,
              email: editingData.customerEmail,
              state: editingData.customerState,
              state_code: editingData.customerStateCode,
              gstin: editingData.customerGSTIN,
              locations: editingData.locationName ? [{
                id: 'temp_location',
                name: editingData.locationName,
                address: editingData.originalSale?.customer_address || editingData.locationName
              }] : []
            };

            setSelectedCustomer(customerFromSale);

            if (editingData.locationName) {
              const tempLocation = {
                id: 'temp_location',
                name: editingData.locationName,
                address: editingData.originalSale?.customer_address || editingData.locationName
              };
              setLocationOptions([tempLocation]);
              setSelectedLocation(tempLocation);
            }
          }
        }
      };

      loadCustomerDataForEdit();

    } else if (!isEditMode && open) {
      reset(defaultValues);
      setSelectedCustomer(null);
      setSelectedLocation(null);
      setLocationOptions([]);
    }
  }, [isEditMode, editingData, open, reset, setSelectedCustomer, setSelectedLocation, setLocationOptions]);

  // Load vehicles from settings
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
      console.error('Load vehicles error:', error);
      setVehicleOptions([]);
    } finally {
      setVehicleLoading(false);
    }
  };

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

  const calculateActualBrickStock = async () => {
    try {
      const [productionResult, salesResult] = await Promise.all([
        productionService.getProductionHistory(1000),
        salesService.getAllSales(),
      ]);

      const totalProduction =
        productionResult.success && productionResult.data
          ? productionResult.data.reduce((sum, prod) => sum + (parseInt(prod.quantity) || 0), 0)
          : 0;

      const totalSales =
        salesResult.success && salesResult.data
          ? salesResult.data.reduce((sum, sale) => sum + (parseInt(sale.quantity) || 0), 0)
          : 0;

      return totalProduction - totalSales;
    } catch (error) {
      console.error('Calculate brick stock error:', error);
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

  // FIXED: Customer search - works in both new and edit mode
  // Removed early return for isEditMode so popup appears when user types in edit mode too
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
            console.error('Customer search error:', error);
          } finally {
            setCustomerSearchLoading(false);
          }
        }, 300)
      );
    } else if (!isEditMode) {
      // Only clear selected customer/location when NOT in edit mode
      setCustomerOptions([]);
      setSelectedCustomer(null);
      setLocationOptions([]);
      setSelectedLocation(null);
    } else {
      // In edit mode, just clear options list but keep the selected customer
      setCustomerOptions([]);
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
    isEditMode,
  ]);

  // Auto-populate locations when customer is selected and user types location
  useEffect(() => {
    if (selectedCustomer && watchLocationName !== undefined) {
      const suggestions = generateLocationSuggestions(selectedCustomer, watchLocationName);
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
        const amounts = calculateTotalSaleAmount(
          quantity, pricePerBrick, discount, discountType, customerState, "GJ"
        );
        setCalculatedAmounts(amounts);
      } else {
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
    watchQuantity, watchPricePerBrick, watchDiscount, watchDiscountType,
    watchCustomerState, watchIncludeGST, setCalculatedAmounts,
  ]);

  // Handle customer selection from autocomplete
  const handleCustomerSelect = (event, value) => {
    if (value && typeof value === "object") {
      setSelectedCustomer(value);
      setValue("customerName", value.name || "");
      setValue("customerPhone", value.phone || "");
      setValue("customerEmail", value.email || "");
      setValue("customerState", value.state || "GJ");
      setValue("customerStateCode", value.state_code || "24");
      setValue("customerGSTIN", value.gstin || "");
      setValue("locationName", "");
      setSelectedLocation(null);
      setLocationOptions(value.locations || []);
    } else if (value && typeof value === "string") {
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
      setSelectedCustomer(null);
      setLocationOptions([]);
      setSelectedLocation(null);
    }
  };

  // Handle location selection from autocomplete
  const handleLocationSelect = (event, value) => {
    if (value && typeof value === "object") {
      setSelectedLocation(value);
      setValue("locationName", value.name);
      if (selectedCustomer?.brick_rates?.[value.id]) {
        setValue("pricePerBrick", selectedCustomer.brick_rates[value.id]);
      }
    } else if (value && typeof value === "string") {
      setSelectedLocation(null);
      setValue("locationName", value);
    } else {
      setSelectedLocation(null);
      setValue("locationName", "");
    }
  };

  // Handle vehicle selection from autocomplete
  const handleVehicleSelect = (event, value) => {
    if (value && typeof value === "object") {
      setValue("vehicleNumber", value.number);
    } else if (value && typeof value === "string") {
      setValue("vehicleNumber", value.toUpperCase());
    } else {
      setValue("vehicleNumber", "");
    }
  };

  const handleClose = () => {
    reset(defaultValues);
    setSelectedCustomer(null);
    setSelectedLocation(null);
    setCustomerOptions([]);
    setLocationOptions([]);
    onClose();
  };

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      if (!isEditMode) {
        setTimeout(() => {
          reset(defaultValues);
          setSelectedCustomer(null);
          setSelectedLocation(null);
          setCustomerOptions([]);
          setLocationOptions([]);
          setCalculatedAmounts({
            subtotal: 0, discountAmount: 0, taxableAmount: 0,
            totalTax: 0, totalAmount: 0, isInterState: false,
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Form submit error:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <ShoppingCartIcon sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {isEditMode ? "Edit Sale" : "Record New Sale"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode ? "Update the sale details below" : "Fill in the details below to record a new sale"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <Controller
              name="saleDate"
              control={control}
              rules={{ required: "Sale date is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Sale Date"
                  type="date"
                  size="small"
                  required
                  error={!!errors.saleDate}
                  helperText={errors.saleDate?.message}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon color="primary" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Customer Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Customer Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Autocomplete
                options={customerOptions}
                getOptionLabel={(option) =>
                  typeof option === "object" ? `${option.name} (${option.phone})` : option
                }
                onChange={handleCustomerSelect}
                loading={customerSearchLoading}
                freeSolo
                value={selectedCustomer}
                inputValue={watchCustomerName}
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
                        size="small"
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
                              <PersonIcon color="primary" fontSize="small" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {customerSearchLoading ? (
                                <CircularProgress color="inherit" size={16} />
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

            <Grid item xs={12} md={4}>
              <Controller
                name="customerPhone"
                control={control}
                rules={{ required: "Phone number is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    size="small"
                    fullWidth
                    required
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="primary" fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Location Field */}
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={locationOptions}
                getOptionLabel={(option) =>
                  typeof option === "object" ? `${option.name} - ${option.address}` : option
                }
                onChange={handleLocationSelect}
                freeSolo
                value={selectedLocation}
                inputValue={watchLocationName}
                disabled={!watchCustomerName || watchCustomerName.length < 2}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2">
                        {option.name}
                        {selectedCustomer?.brick_rates?.[option.id] && (
                          <Chip
                            label={`₹${selectedCustomer.brick_rates[option.id]}/brick`}
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
                        size="small"
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
                              <LocationIcon color="primary" fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* GSTIN Field - only show when GST is included */}
            {watchIncludeGST && (
              <Grid item xs={12} md={4}>
                <Controller
                  name="customerGSTIN"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="GSTIN (Optional)"
                      size="small"
                      fullWidth
                      placeholder="e.g., 24BLLPP8863R1ZX"
                      error={!!errors.customerGSTIN}
                      helperText={errors.customerGSTIN?.message || "15-character GSTIN number"}
                      inputProps={{ maxLength: 15 }}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
              </Grid>
            )}

            <Divider sx={{ width: "100%", my: 1 }} />

            {/* Product Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                <MoneyIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Product Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
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
                    size="small"
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

            <Grid item xs={12} md={4}>
              <Controller
                name="pricePerBrick"
                control={control}
                rules={{
                  required: "Price per brick is required",
                  min: { value: 0.01, message: "Price must be greater than 0" },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Price per Brick"
                    type="number"
                    step="0.01"
                    size="small"
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
                          <MoneyIcon color="primary" fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Divider sx={{ width: "100%", my: 1 }} />

            {/* Transport Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                <VehicleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Transport Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
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
                      <Typography variant="body2" fontWeight="bold">{option.number}</Typography>
                      {option.driver && (
                        <Typography variant="caption" color="text.secondary">Driver: {option.driver}</Typography>
                      )}
                      {option.capacity && (
                        <Typography variant="caption" color="text.secondary">Capacity: {option.capacity} tons</Typography>
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
                        size="small"
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
                              <VehicleIcon color="primary" fontSize="small" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {vehicleLoading ? (
                                <CircularProgress color="inherit" size={16} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="challanNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Challan/Receipt Number"
                    size="small"
                    fullWidth
                    placeholder="e.g., CH-001"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ReceiptIcon color="primary" fontSize="small" />
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
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle1" gutterBottom color="success.main" fontWeight="bold">
                      Amount Calculation
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency(calculatedAmounts.subtotal)}
                        </Typography>
                      </Grid>
                      {calculatedAmounts.discountAmount > 0 && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">Discount</Typography>
                          <Typography variant="body1" color="error.main" fontWeight="bold">
                            -{formatCurrency(calculatedAmounts.discountAmount)}
                          </Typography>
                        </Grid>
                      )}
                      {watchIncludeGST && calculatedAmounts.totalTax > 0 && (
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            {calculatedAmounts.isInterState ? "IGST (12%)" : "CGST+SGST (12%)"}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency(calculatedAmounts.totalTax)}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">
                          Total Amount {watchIncludeGST ? "(incl. GST)" : "(excl. GST)"}
                        </Typography>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {formatCurrency(calculatedAmounts.totalAmount)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Divider sx={{ width: "100%", my: 1 }} />
          </Grid>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          disabled={isSubmitting || calculatedAmounts.totalAmount === 0}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <ShoppingCartIcon />}
        >
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