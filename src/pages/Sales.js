// Sales.js - Enhanced UI with consistent design pattern
import React, { useState, useEffect, useCallback } from "react";
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
  Tab,
  Tabs,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Fab,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  alpha,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  LocalShipping as VehicleIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  AccountBalance as RevenueIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
// Removed date picker imports to avoid dependency issues
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";

// Import contexts and services
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";
import { useSales } from "../hooks/useSales";

// Import components
import GSTInvoiceViewer from "../components/sales/GSTInvoiceViewer";

// Import utilities
import {
  validateSaleCapacity,
  calculateTotalSaleAmount,
  formatCurrency,
  formatQuantity,
  validateSaleData,
  generateCustomerSuggestions,
  generateLocationSuggestions,
} from "../utils/calculations";
import {
  HSN_CODES,
  PAYMENT_METHODS,
  INDIAN_STATES,
  VALIDATION_RULES,
} from "../utils/constants";

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sales-tabpanel-${index}`}
      aria-labelledby={`sales-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Sales() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { actions: appActions, settings } = useApp();
  const { bricks, actions: inventoryActions } = useInventory();
  const {
    sales,
    recordSale,
    loadSalesData,
    searchCustomers,
    getSaleByInvoice,
    generateInvoicePDF,
    isLoading,
  } = useSales();

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Invoice viewer state
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState(null);

  // Auto-complete states
  const [customerOptions, setCustomerOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    searchTerm: "",
    dateFrom: "",
    dateTo: "",
    customerName: "",
    locationName: "",
    vehicleNumber: "",
  });

  // Form management with reordered fields
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      // Date comes first - using string format for HTML date input
      saleDate: new Date().toISOString().split("T")[0],

      // Customer information (moved up)
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerState: "GJ",
      customerStateCode: "24",
      customerGSTIN: "",

      // Location information
      locationName: "",

      // Product information (moved down)
      quantity: "",
      pricePerBrick: 6.15,

      // Transport fields
      vehicleNumber: "",
      challanNumber: "",

      // Payment information
      discount: 0,
      discountType: "amount",
      paymentMethod: "cash",
      notes: "",
    },
  });

  const watchCustomerName = watch("customerName");
  const watchLocationName = watch("locationName");
  const watchQuantity = watch("quantity");
  const watchPricePerBrick = watch("pricePerBrick");
  const watchDiscount = watch("discount");
  const watchDiscountType = watch("discountType");
  const watchCustomerState = watch("customerState");

  // Debounced customer search
  const [customerSearchTimeout, setCustomerSearchTimeout] = useState(null);

  // Calculate real-time totals
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxableAmount: 0,
    totalTax: 0,
    totalAmount: 0,
    isInterState: false,
  });

  // Load initial data
  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSalesData();
    } catch (error) {
      console.error("Error refreshing sales data:", error);
      toast.error("Failed to refresh sales data");
    } finally {
      setRefreshing(false);
    }
  };

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
  }, [watchCustomerName, searchCustomers]);

  // Auto-populate locations when customer is selected and user types location
  useEffect(() => {
    if (selectedCustomer && watchLocationName !== undefined) {
      const suggestions = generateLocationSuggestions(
        selectedCustomer,
        watchLocationName
      );
      setLocationOptions(suggestions.map((s) => s.location));
    }
  }, [selectedCustomer, watchLocationName]);

  // Calculate amounts in real-time
  useEffect(() => {
    const quantity = parseInt(watchQuantity) || 0;
    const pricePerBrick = parseFloat(watchPricePerBrick) || 0;
    const discount = parseFloat(watchDiscount) || 0;
    const discountType = watchDiscountType || "amount";
    const customerState = watchCustomerState || "GJ";

    if (quantity > 0 && pricePerBrick > 0) {
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

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle view invoice
  const handleViewInvoice = (sale) => {
    setSelectedSaleForInvoice(sale);
    setInvoiceViewerOpen(true);
  };

  // Handle dialog operations
  const handleOpenDialog = () => {
    reset({
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
    });
    setSelectedCustomer(null);
    setSelectedLocation(null);
    setCustomerOptions([]);
    setLocationOptions([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSale(null);
    setSelectedCustomer(null);
    setSelectedLocation(null);
    setCustomerOptions([]);
    setLocationOptions([]);
    reset();
  };

  // Enhanced form submission
  const onSubmit = async (data) => {
    try {
      // Validate brick availability
      const capacity = validateSaleCapacity(
        parseInt(data.quantity),
        bricks.total_stock
      );

      if (!capacity.isValid) {
        toast.error(
          `Insufficient stock. Required: ${data.quantity}, Available: ${bricks.total_stock}`
        );
        return;
      }

      // Validate form data (without customerAddress)
      const validation = validateSaleData({
        quantity: data.quantity,
        pricePerBrick: data.pricePerBrick,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerGSTIN: data.customerGSTIN,
        vehicleNumber: data.vehicleNumber,
      });

      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError);
        return;
      }

      // Prepare enhanced sale data
      const enhancedSaleData = {
        // Date (already in YYYY-MM-DD format)
        date: data.saleDate,

        // Product details
        quantity: parseInt(data.quantity),
        pricePerBrick: parseFloat(data.pricePerBrick),
        hsnCode: HSN_CODES.FLY_ASH_BRICKS,

        // Customer details
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.locationName || "Address not provided", // Use location as address
        customerState: data.customerState,
        customerStateCode: data.customerStateCode,
        customerGSTIN: data.customerGSTIN,

        // Location details
        locationName: data.locationName,
        locationId: selectedLocation?.id || null,

        // Transport details
        vehicleNumber: data.vehicleNumber.toUpperCase(),
        challanNumber: data.challanNumber,

        // Payment details
        discount: parseFloat(data.discount) || 0,
        discountType: data.discountType,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      };

      const result = await recordSale(enhancedSaleData);

      if (result.success) {
        // Try to reload inventory data if the function exists
        try {
          if (
            inventoryActions &&
            typeof inventoryActions.loadInventoryData === "function"
          ) {
            await inventoryActions.loadInventoryData();
          }
        } catch (inventoryError) {
          console.warn("Could not reload inventory data:", inventoryError);
          // Continue anyway - sale was successful
        }

        handleCloseDialog();
      }
    } catch (error) {
      console.error("Error recording sale:", error);
      toast.error("Failed to record sale");
    }
  };

  // Filter sales based on search criteria
  const filteredSales = sales.history.filter((sale) => {
    const matchesSearchTerm =
      !searchFilters.searchTerm ||
      sale.customer_name
        .toLowerCase()
        .includes(searchFilters.searchTerm.toLowerCase()) ||
      sale.invoice_number
        .toLowerCase()
        .includes(searchFilters.searchTerm.toLowerCase());

    const matchesDateFrom =
      !searchFilters.dateFrom || sale.date >= searchFilters.dateFrom;
    const matchesDateTo =
      !searchFilters.dateTo || sale.date <= searchFilters.dateTo;

    const matchesCustomer =
      !searchFilters.customerName ||
      sale.customer_name
        .toLowerCase()
        .includes(searchFilters.customerName.toLowerCase());

    const matchesLocation =
      !searchFilters.locationName ||
      (sale.location_name &&
        sale.location_name
          .toLowerCase()
          .includes(searchFilters.locationName.toLowerCase()));

    const matchesVehicle =
      !searchFilters.vehicleNumber ||
      (sale.vehicle_number &&
        sale.vehicle_number
          .toLowerCase()
          .includes(searchFilters.vehicleNumber.toLowerCase()));

    return (
      matchesSearchTerm &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesCustomer &&
      matchesLocation &&
      matchesVehicle
    );
  });

  return (
    <Box>
      {/* Header - Consistent with other pages */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Sales Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Monitor sales transactions and manage customer billing.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh sales data">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading indicator */}
      {(isLoading || refreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Enhanced Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            },
            "& .MuiTab-root": {
              fontWeight: 600,
              textTransform: "none",
              minHeight: 64,
              "&.Mui-selected": {
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          <Tab
            label="Overview"
            icon={<TrendingUpIcon />}
            iconPosition="start"
          />
          <Tab
            label="Sales History"
            icon={<ReceiptIcon />}
            iconPosition="start"
          />
          <Tab
            label="Analytics"
            icon={<TrendingUpIcon />}
            iconPosition="start"
          />
          <Tab
            label="Customer List"
            icon={<PeopleIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Main Stats Grid - 3 Cards of Equal Size */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {/* Today's Sales */}
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
                          Today's Sales
                        </Typography>
                        <Typography variant="h5" component="div">
                          {sales.todaySales?.total_sales || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatQuantity(sales.todaySales?.total_quantity || 0, "bricks")}
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
                        <ShoppingCartIcon />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Today's Revenue */}
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
                          Today's Revenue
                        </Typography>
                        <Typography variant="h5" component="div">
                          {formatCurrency(sales.todaySales?.total_revenue || 0)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Revenue earned today
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
                        <RevenueIcon />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Total Customers */}
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
                          Total Customers
                        </Typography>
                        <Typography variant="h5" component="div">
                          {sales.customers?.length || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Active customers
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                        }}
                      >
                        <PeopleIcon />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Record New Sale Button - Consistent Design */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Record New Sale
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click the button to start recording a new sale with
                      intelligent auto-population features.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}
                  >
                    New Sale
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Sales History Tab */}
      <TabPanel value={currentTab} index={1}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Typography variant="h6" fontWeight="bold">
                Sales History ({filteredSales.length})
              </Typography>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Search sales..."
                  value={searchFilters.searchTerm}
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
                  value={searchFilters.dateFrom}
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
                  value={searchFilters.dateTo}
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
                  value={searchFilters.customerName}
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
                      <TableCell sx={{ fontWeight: "bold" }}>Vehicle</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSales.map((sale) => (
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
                            {formatCurrency(sale.total_amount)}
                          </Typography>
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
                          <Tooltip title="View Invoice">
                            <IconButton
                              size="small"
                              onClick={() => handleViewInvoice(sale)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Monthly Performance
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {sales.stats?.total_sales || 0}
                    </Typography>
                    <Typography variant="body2">Total Sales</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {formatCurrency(sales.stats?.total_revenue || 0)}
                    </Typography>
                    <Typography variant="body2">Revenue</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Average Metrics
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {formatCurrency(sales.stats?.average_order_value || 0)}
                    </Typography>
                    <Typography variant="body2">Avg. Order Value</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {formatQuantity(sales.stats?.total_quantity || 0)}
                    </Typography>
                    <Typography variant="body2">Total Quantity</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Customer List Tab */}
      <TabPanel value={currentTab} index={3}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Typography variant="h6" fontWeight="bold">
                Customer List ({(() => {
                  // Calculate unique customers from sales history
                  const uniqueCustomers = sales.history.reduce((acc, sale) => {
                    const key = `${sale.customer_name}_${sale.customer_phone}`;
                    if (!acc[key]) {
                      acc[key] = {
                        name: sale.customer_name,
                        phone: sale.customer_phone,
                        email: sale.customer_email || '',
                        totalPurchases: 0,
                        totalAmount: 0,
                        totalQuantity: 0,
                        lastPurchase: sale.date,
                        firstPurchase: sale.date,
                        locations: new Set()
                      };
                    }
                    acc[key].totalPurchases += 1;
                    acc[key].totalAmount += parseFloat(sale.total_amount || 0);
                    acc[key].totalQuantity += parseInt(sale.quantity || 0);
                    if (sale.location_name) {
                      acc[key].locations.add(sale.location_name);
                    }
                    if (sale.date > acc[key].lastPurchase) {
                      acc[key].lastPurchase = sale.date;
                    }
                    if (sale.date < acc[key].firstPurchase) {
                      acc[key].firstPurchase = sale.date;
                    }
                    return acc;
                  }, {});
                  return Object.keys(uniqueCustomers).length;
                })()})
              </Typography>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Search customers..."
                  value={searchFilters.searchTerm}
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

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Orders</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>Total Quantity</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Locations</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Last Purchase</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Customer Since</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Process and filter customers
                    const uniqueCustomers = sales.history.reduce((acc, sale) => {
                      const key = `${sale.customer_name}_${sale.customer_phone}`;
                      if (!acc[key]) {
                        acc[key] = {
                          name: sale.customer_name,
                          phone: sale.customer_phone,
                          email: sale.customer_email || '',
                          totalPurchases: 0,
                          totalAmount: 0,
                          totalQuantity: 0,
                          lastPurchase: sale.date,
                          firstPurchase: sale.date,
                          locations: new Set()
                        };
                      }
                      acc[key].totalPurchases += 1;
                      acc[key].totalAmount += parseFloat(sale.total_amount || 0);
                      acc[key].totalQuantity += parseInt(sale.quantity || 0);
                      if (sale.location_name) {
                        acc[key].locations.add(sale.location_name);
                      }
                      if (sale.date > acc[key].lastPurchase) {
                        acc[key].lastPurchase = sale.date;
                      }
                      if (sale.date < acc[key].firstPurchase) {
                        acc[key].firstPurchase = sale.date;
                      }
                      return acc;
                    }, {});

                    // Convert to array and filter
                    const customersArray = Object.values(uniqueCustomers).filter(customer =>
                      !searchFilters.searchTerm ||
                      customer.name.toLowerCase().includes(searchFilters.searchTerm.toLowerCase()) ||
                      customer.phone.includes(searchFilters.searchTerm)
                    );

                    // Sort by total amount (highest first)
                    customersArray.sort((a, b) => b.totalAmount - a.totalAmount);

                    if (customersArray.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                            <Typography color="textSecondary">
                              {sales.history.length === 0 
                                ? "No customers yet. Start by recording your first sale."
                                : "No customers match your search criteria."
                              }
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return customersArray.map((customer, index) => (
                      <TableRow key={`${customer.name}_${customer.phone}`} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {customer.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {customer.phone}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {customer.email || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={customer.totalPurchases}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {formatCurrency(customer.totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatQuantity(customer.totalQuantity)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Array.from(customer.locations).slice(0, 2).map((location) => (
                              <Chip
                                key={location}
                                label={location}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                            {customer.locations.size > 2 && (
                              <Chip
                                label={`+${customer.locations.size - 2} more`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {customer.locations.size === 0 && (
                              <Typography variant="caption" color="text.secondary">
                                No locations
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {customer.lastPurchase}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {customer.firstPurchase}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Enhanced Sale Recording Dialog - Keep existing implementation */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ShoppingCartIcon sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Record New Sale
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in the details below to record a new sale
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {isLoading && <LinearProgress sx={{ mb: 2 }} />}
          <form onSubmit={handleSubmit(onSubmit)}>
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
                              Total Amount (incl. GST)
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
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
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

              {/* Location Field - Editable */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={locationOptions}
                  getOptionLabel={(option) => `${option.name} - ${option.address}`}
                  onChange={handleLocationSelect}
                  freeSolo
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

              <Divider sx={{ width: "100%", my: 2 }} />

              {/* Product Information - Moved down */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
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
                        `Available: ${formatQuantity(bricks.total_stock)}`
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
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                  <VehicleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Transport Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="vehicleNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Vehicle Number"
                      fullWidth
                      placeholder="e.g., GJ01AB1234"
                      error={!!errors.vehicleNumber}
                      helperText={errors.vehicleNumber?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <VehicleIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                      <Typography variant="h6" gutterBottom color="success.main" fontWeight="bold">
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
                            <Typography variant="h6" color="error.main" fontWeight="bold">
                              -{formatCurrency(calculatedAmounts.discountAmount)}
                            </Typography>
                          </Grid>
                        )}
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            {calculatedAmounts.isInterState ? "IGST (12%)" : "CGST+SGST (12%)"}
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {formatCurrency(calculatedAmounts.totalTax)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Total Amount
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

              <Divider sx={{ width: "100%", my: 2 }} />

              {/* Payment Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                  Payment & Notes
                </Typography>
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
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
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
          <Button onClick={handleCloseDialog} size="large">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            size="large"
            disabled={isSubmitting || calculatedAmounts.totalAmount === 0}
            startIcon={
              isSubmitting ? <CircularProgress size={20} /> : <ShoppingCartIcon />
            }
          >
            {isSubmitting ? "Recording..." : "Record Sale"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GST Invoice Viewer */}
      <GSTInvoiceViewer
        open={invoiceViewerOpen}
        onClose={() => setInvoiceViewerOpen(false)}
        saleData={selectedSaleForInvoice}
      />

      {/* Enhanced Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add sale"
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
          }}
          onClick={handleOpenDialog}
        >
          <AddIcon fontSize="large" />
        </Fab>
      )}
    </Box>
  );
}

export default Sales;