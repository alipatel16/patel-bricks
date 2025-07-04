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
  Tabs,
  Tab,
  LinearProgress,
  Divider,
  InputAdornment,
  Switch,
  FormControlLabel,
  Autocomplete,
} from "@mui/material";
import {
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Visibility as ViewIcon,
  Home as AddressIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Calculate as CalculateIcon,
  Search as SearchIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";

// Import contexts
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";

// Import services
import { salesService } from "../services/salesService";

// Import utilities
import {
  calculateSaleAmount,
  validateSaleCapacity,
} from "../utils/calculations";
import {
  INDIAN_STATES,
  PAYMENT_METHODS,
  VALIDATION_RULES,
  HSN_CODES,
} from "../utils/constants";
import GSTInvoiceViewer from "../components/sales/GSTInvoiceViewer";
import toast from "react-hot-toast";

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
  const { actions: appActions, settings } = useApp();
  const { bricks, actions: inventoryActions } = useInventory();

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [salesData, setSalesData] = useState({
    history: [],
    todaySales: null,
    stats: null,
    customers: [],
    loading: false,
    error: null,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Enhanced state for GST features
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    total: 0,
  });

  // Dialog states for enhanced features
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);

  // Search and filter states for Sales History
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [salesFilterBy, setSalesFilterBy] = useState("all");
  const [salesDateRange, setSalesDateRange] = useState({ start: "", end: "" });
  const [salesPage, setSalesPage] = useState(0);
  const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);

  // Search and filter states for Customers
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSortBy, setCustomerSortBy] = useState("name");
  const [customerViewMode, setCustomerViewMode] = useState("grid");

  // Form management with enhanced fields
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
      pricePerBrick: 6.15, // Updated default price
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "", // New field
      customerState: "GJ", // New field
      customerStateCode: "24", // New field
      customerGSTIN: "", // New field
      discount: 0,
      discountType: "amount", // New field
      paymentMethod: "cash",
      notes: "",
    },
  });

  const watchQuantity = watch("quantity");
  const watchPricePerBrick = watch("pricePerBrick");
  const watchDiscount = watch("discount");
  const watchDiscountType = watch("discountType");
  const watchCustomerState = watch("customerState");

  // Filter and sort customers data
  const filteredCustomersData = React.useMemo(() => {
    let filtered = salesData.customers || [];

    // Text search
    if (customerSearchTerm) {
      const searchLower = customerSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          (customer.name || "").toLowerCase().includes(searchLower) ||
          (customer.phone || "").toLowerCase().includes(searchLower) ||
          (customer.email || "").toLowerCase().includes(searchLower) ||
          (customer.address || "").toLowerCase().includes(searchLower) ||
          (customer.gstin || "").toLowerCase().includes(searchLower)
      );
    }

    // Sort customers
    filtered.sort((a, b) => {
      switch (customerSortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "recent":
          return (
            new Date(b.last_purchase || 0) - new Date(a.last_purchase || 0)
          );
        case "purchases":
          return (b.total_purchases || 0) - (a.total_purchases || 0);
        case "value":
          return (b.total_spent || 0) - (a.total_spent || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [salesData.customers, customerSearchTerm, customerSortBy]);

  // Filter sales data based on search criteria
  const filteredSalesData = React.useMemo(() => {
    let filtered = salesData.history || [];

    // Text search
    if (salesSearchTerm) {
      const searchLower = salesSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          (sale.customer_name || "").toLowerCase().includes(searchLower) ||
          (sale.customer_phone || "").toLowerCase().includes(searchLower) ||
          (sale.invoice_number || sale.id || "")
            .toLowerCase()
            .includes(searchLower) ||
          (sale.payment_method || "").toLowerCase().includes(searchLower)
      );
    }

    // Payment method filter
    if (salesFilterBy !== "all") {
      filtered = filtered.filter(
        (sale) => sale.payment_method === salesFilterBy
      );
    }

    // Date range filter
    if (salesDateRange.start) {
      filtered = filtered.filter((sale) => sale.date >= salesDateRange.start);
    }
    if (salesDateRange.end) {
      filtered = filtered.filter((sale) => sale.date <= salesDateRange.end);
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salesData.history, salesSearchTerm, salesFilterBy, salesDateRange]);

  // Paginated sales data
  const paginatedSalesData = React.useMemo(() => {
    const startIndex = salesPage * salesRowsPerPage;
    return filteredSalesData.slice(startIndex, startIndex + salesRowsPerPage);
  }, [filteredSalesData, salesPage, salesRowsPerPage]);

  // Enhanced sale calculation with GST
  const saleCalculation = React.useMemo(() => {
    const quantity = parseInt(watchQuantity) || 0;
    const price = parseFloat(watchPricePerBrick) || 0;
    const discount = parseFloat(watchDiscount) || 0;
    const discountType = watchDiscountType || "amount";
    const customerState = watchCustomerState || "GJ";

    if (quantity > 0 && price > 0) {
      const subtotal = quantity * price;
      const discountAmount =
        discountType === "percentage" ? (subtotal * discount) / 100 : discount;
      const taxableAmount = subtotal - discountAmount;

      // Calculate GST based on customer state
      const isInterState = customerState !== "GJ";
      let cgstAmount = 0,
        sgstAmount = 0,
        igstAmount = 0;

      if (isInterState) {
        igstAmount = (taxableAmount * 12) / 100; // 12% IGST
      } else {
        cgstAmount = (taxableAmount * 6) / 100; // 6% CGST
        sgstAmount = (taxableAmount * 6) / 100; // 6% SGST
      }

      const totalTax = cgstAmount + sgstAmount + igstAmount;
      const total = taxableAmount + totalTax;

      return {
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        igstAmount: igstAmount.toFixed(2),
        totalTax: totalTax.toFixed(2),
        total: total.toFixed(2),
        isInterState,
      };
    }

    return {
      subtotal: "0.00",
      discountAmount: "0.00",
      taxableAmount: "0.00",
      cgstAmount: "0.00",
      sgstAmount: "0.00",
      igstAmount: "0.00",
      totalTax: "0.00",
      total: "0.00",
      isInterState: false,
    };
  }, [
    watchQuantity,
    watchPricePerBrick,
    watchDiscount,
    watchDiscountType,
    watchCustomerState,
  ]);

  // Load sales data on mount
  useEffect(() => {
    loadSalesData();
  }, []);

  // Update state code when customer state changes
  useEffect(() => {
    const stateInfo = Object.entries(INDIAN_STATES).find(
      ([key, value]) => key === watchCustomerState
    );
    if (stateInfo) {
      setValue("customerStateCode", stateInfo[1].code);
    }
  }, [watchCustomerState, setValue]);

  // Update calculations when form values change
  useEffect(() => {
    setCalculations(saleCalculation);
  }, [saleCalculation]);

  // Load all sales data with proper error handling
  const loadSalesData = async () => {
    try {
      setSalesData((prev) => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split("T")[0];

      const [historyResult, todayResult, statsResult, customersResult] =
        await Promise.all([
          salesService.getSalesHistory(50),
          salesService.getDailySales(today),
          salesService.getSalesStats("month"),
          salesService.getAllCustomers(),
        ]);

      // Calculate monthly revenue properly
      let monthlyRevenue = 0;
      if (
        statsResult.success &&
        statsResult.data &&
        typeof statsResult.data.total_sales === "number"
      ) {
        monthlyRevenue = statsResult.data.total_sales;
      } else if (historyResult.success && historyResult.data) {
        // Fallback calculation
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthSales = historyResult.data.filter((sale) =>
          sale.date?.startsWith(currentMonth)
        );
        monthlyRevenue = monthSales.reduce(
          (sum, sale) => sum + (parseFloat(sale.total_amount) || 0),
          0
        );
      }

      setSalesData({
        history: historyResult.success ? historyResult.data : [],
        todaySales: todayResult.success
          ? todayResult.data
          : { total_revenue: 0, total_quantity: 0 },
        stats: statsResult.success
          ? { ...statsResult.data, total_sales: monthlyRevenue }
          : { total_sales: monthlyRevenue },
        customers: customersResult.success ? customersResult.data : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error loading sales data:", error);
      setSalesData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load sales data",
      }));
      toast.error("Failed to load sales data");
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle dialog operations
  const handleOpenDialog = () => {
    reset({
      quantity: "",
      pricePerBrick: 6.15,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerState: "GJ",
      customerStateCode: "24",
      customerGSTIN: "",
      discount: 0,
      discountType: "amount",
      paymentMethod: "cash",
      notes: "",
    });
    setUseExistingCustomer(false);
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSale(null);
    reset();
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    if (customer) {
      setValue("customerName", customer.name || "");
      setValue("customerPhone", customer.phone || "");
      setValue("customerEmail", customer.email || "");
      setValue("customerAddress", customer.address || "");
      setValue("customerState", customer.state || "GJ");
      setValue("customerStateCode", customer.state_code || "24");
      setValue("customerGSTIN", customer.gstin || "");
      setSelectedCustomer(customer);
    }
  };

  // Enhanced form submission with GST support
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

      // Validate required fields
      if (!data.customerName || !data.customerPhone || !data.customerAddress) {
        toast.error("Please fill in all required customer fields");
        return;
      }

      // Validate GSTIN if provided
      if (
        data.customerGSTIN &&
        !VALIDATION_RULES.GSTIN_REGEX.test(data.customerGSTIN)
      ) {
        toast.error("Please enter a valid GSTIN");
        return;
      }

      // Prepare enhanced sale data
      const enhancedSaleData = {
        quantity: parseInt(data.quantity),
        pricePerBrick: parseFloat(data.pricePerBrick),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.customerAddress,
        customerState: data.customerState,
        customerStateCode: data.customerStateCode,
        customerGSTIN: data.customerGSTIN,
        discount: parseFloat(data.discount) || 0,
        discountType: data.discountType,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        hsnCode: HSN_CODES.FLY_ASH_BRICKS,
      };

      const result = await salesService.recordSale(enhancedSaleData);

      if (result.success) {
        toast.success("Sale recorded successfully!");
        handleCloseDialog();
        await loadSalesData(); // Reload data
      } else {
        toast.error(result.error || "Failed to record sale");
      }
    } catch (error) {
      console.error("Error submitting sale:", error);
      toast.error("Failed to record sale");
    }
  };

  // Handle view details - FIXED
  const handleViewDetails = (sale) => {
    setSelectedSaleForDetails(sale);
    setDetailsDialogOpen(true);
  };

  // Handle view invoice
  const handleViewInvoice = (sale) => {
    setSelectedSaleForDetails(sale);
    setInvoiceViewerOpen(true);
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
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
            Sales Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Track daily brick sales and manage billing operations
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Record Sales
        </Button>
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Sales
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(salesData.todaySales?.total_revenue || 0)}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: "primary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(salesData.stats?.total_sales || 0)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Typography variant="h4">
                    {salesData.customers.length}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: "info.main" }} />
              </Box>
              {/* <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
                sx={{ mt: 2 }}
                fullWidth
              >
                Record New Sale
              </Button> */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {salesData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {salesData.error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {salesData.loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Tabs */}
      <Card sx={{ padding: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Sales History" />
            <Tab label="Customers" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Sales History Tab */}
        <TabPanel value={currentTab} index={0}>
          {/* Search and Filter Controls */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by customer, phone, invoice..."
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <HistoryIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={salesFilterBy}
                    label="Payment Method"
                    onChange={(e) => setSalesFilterBy(e.target.value)}
                  >
                    <MenuItem value="all">All Methods</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="check">Check</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  value={salesDateRange.start}
                  onChange={(e) =>
                    setSalesDateRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  value={salesDateRange.end}
                  onChange={(e) =>
                    setSalesDateRange((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSalesSearchTerm("");
                    setSalesFilterBy("all");
                    setSalesDateRange({ start: "", end: "" });
                    setSalesPage(0);
                  }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>

            {/* Results Summary */}
            {(salesSearchTerm ||
              salesFilterBy !== "all" ||
              salesDateRange.start ||
              salesDateRange.end) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Showing {filteredSalesData.length} of {salesData.history.length}{" "}
                sales records
                {filteredSalesData.length > 0 && (
                  <span>
                    {" "}
                    • Total Value:{" "}
                    {formatCurrency(
                      filteredSalesData.reduce(
                        (sum, sale) =>
                          sum + (parseFloat(sale.total_amount) || 0),
                        0
                      )
                    )}
                  </span>
                )}
              </Alert>
            )}
          </Box>

          {/* Sales Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price/Brick</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesData.loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <LinearProgress sx={{ width: "50%" }} />
                        <Typography color="textSecondary">
                          Loading sales history...
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : paginatedSalesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        {salesSearchTerm ||
                        salesFilterBy !== "all" ||
                        salesDateRange.start ||
                        salesDateRange.end
                          ? "No sales found matching your search criteria"
                          : "No sales recorded yet"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSalesData.map((sale) => (
                    <TableRow key={sale.id || sale.invoice_number} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(sale.date)}
                        </Typography>
                        {sale.timestamp && (
                          <Typography variant="caption" color="textSecondary">
                            {new Date(sale.timestamp).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontWeight: 500 }}
                        >
                          {sale.invoice_number || sale.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sale.customer_name || "Walk-in Customer"}
                          </Typography>
                          {sale.customer_phone && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <PhoneIcon sx={{ fontSize: 12 }} />
                              {sale.customer_phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {(sale.quantity || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          bricks
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(sale.price_per_brick || 0)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(sale.total_amount || 0)}
                        </Typography>
                        {sale.discount_percentage > 0 && (
                          <Typography
                            variant="caption"
                            color="success.main"
                            display="block"
                          >
                            ({sale.discount_percentage}% discount)
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={sale.payment_method || "cash"}
                          size="small"
                          color={
                            sale.payment_method === "cash"
                              ? "success"
                              : "default"
                          }
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={sale.status || "completed"}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(sale)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View invoice">
                            <IconButton
                              size="small"
                              onClick={() => handleViewInvoice(sale)}
                              color="primary"
                            >
                              <ReceiptIcon />
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

          {/* Pagination */}
          {filteredSalesData.length > salesRowsPerPage && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Showing {salesPage * salesRowsPerPage + 1} to{" "}
                {Math.min(
                  (salesPage + 1) * salesRowsPerPage,
                  filteredSalesData.length
                )}{" "}
                of {filteredSalesData.length} results
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={salesRowsPerPage}
                    onChange={(e) => {
                      setSalesRowsPerPage(parseInt(e.target.value));
                      setSalesPage(0);
                    }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  size="small"
                  disabled={salesPage === 0}
                  onClick={() => setSalesPage((prev) => prev - 1)}
                >
                  Previous
                </Button>

                <Typography variant="body2" sx={{ mx: 2 }}>
                  Page {salesPage + 1} of{" "}
                  {Math.ceil(filteredSalesData.length / salesRowsPerPage)}
                </Typography>

                <Button
                  size="small"
                  disabled={
                    salesPage >=
                    Math.ceil(filteredSalesData.length / salesRowsPerPage) - 1
                  }
                  onClick={() => setSalesPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </TabPanel>

        {/* Customers Tab */}
        <TabPanel value={currentTab} index={1}>
          {/* Search and Filter Controls */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search customers by name, phone, email..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={customerSortBy}
                    label="Sort By"
                    onChange={(e) => setCustomerSortBy(e.target.value)}
                    startAdornment={
                      <SortIcon fontSize="small" sx={{ mr: 1 }} />
                    }
                  >
                    <MenuItem value="name">Name (A-Z)</MenuItem>
                    <MenuItem value="recent">Recent Purchase</MenuItem>
                    <MenuItem value="purchases">Most Purchases</MenuItem>
                    <MenuItem value="value">Highest Value</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title="Grid View">
                    <IconButton
                      size="small"
                      color={
                        customerViewMode === "grid" ? "primary" : "default"
                      }
                      onClick={() => setCustomerViewMode("grid")}
                    >
                      <GridViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="List View">
                    <IconButton
                      size="small"
                      color={
                        customerViewMode === "list" ? "primary" : "default"
                      }
                      onClick={() => setCustomerViewMode("list")}
                    >
                      <ListViewIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12} md={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setCustomerSearchTerm("");
                    setCustomerSortBy("name");
                  }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>

            {/* Results Summary */}
            {customerSearchTerm && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Found {filteredCustomersData.length} customer
                {filteredCustomersData.length !== 1 ? "s" : ""} matching "
                {customerSearchTerm}"
              </Alert>
            )}
          </Box>

          {/* Customer Content */}
          {filteredCustomersData.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ textAlign: "center", py: 6 }}>
                <PersonIcon
                  sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  {customerSearchTerm
                    ? "No customers found"
                    : "No customers yet"}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {customerSearchTerm
                    ? "Try adjusting your search criteria"
                    : "Customer information will appear here after recording sales"}
                </Typography>
              </Box>
            </Grid>
          ) : customerViewMode === "grid" ? (
            // Grid View
            <Grid container spacing={2}>
              {filteredCustomersData.map((customer) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  lg={3}
                  key={customer.id || customer.phone}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      transition: "all 0.2s",
                      "&:hover": {
                        boxShadow: 2,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <PersonIcon
                          sx={{ fontSize: 32, color: "primary.main", mr: 1 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {customer.name || "Unknown"}
                        </Typography>
                      </Box>

                      {customer.phone && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {customer.phone}
                          </Typography>
                        </Box>
                      )}

                      {customer.email && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" noWrap>
                            {customer.email}
                          </Typography>
                        </Box>
                      )}

                      {customer.address && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "start",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <AddressIcon
                            fontSize="small"
                            color="action"
                            sx={{ mt: 0.25 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {customer.address}
                          </Typography>
                        </Box>
                      )}

                      {customer.gstin && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {customer.gstin}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          Total Purchases:
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {customer.total_purchases || 0}
                        </Typography>
                      </Box>

                      <Typography variant="caption" color="textSecondary">
                        Last purchase:{" "}
                        {customer.last_purchase
                          ? formatDate(customer.last_purchase)
                          : "Never"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            // List View
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>GSTIN</TableCell>
                    <TableCell align="right">Purchases</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                    <TableCell>Last Purchase</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomersData.map((customer) => (
                    <TableRow key={customer.id || customer.phone} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <PersonIcon fontSize="small" color="primary" />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {customer.name || "Unknown"}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box>
                          {customer.phone && (
                            <Typography
                              variant="body2"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <PhoneIcon sx={{ fontSize: 12 }} />
                              {customer.phone}
                            </Typography>
                          )}
                          {customer.email && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <EmailIcon sx={{ fontSize: 12 }} />
                              {customer.email}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {customer.address || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {customer.gstin || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {customer.total_purchases || 0}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(customer.total_spent || 0)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {customer.last_purchase
                            ? formatDate(customer.last_purchase)
                            : "Never"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Sales Analytics (Coming Soon)
          </Typography>
          <Typography color="textSecondary">
            Detailed sales analytics and reports will be available in a future
            update.
          </Typography>
        </TabPanel>
      </Card>

      {/* Enhanced Sale Recording Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Record New Sale</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Product Information */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <ShoppingCartIcon sx={{ mr: 1 }} />
                  Product Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="quantity"
                  control={control}
                  rules={{ required: "Quantity is required", min: 1 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Quantity"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.quantity}
                      helperText={
                        errors.quantity?.message ||
                        `Available: ${formatNumber(
                          bricks.total_stock || 0
                        )} bricks`
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">bricks</InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="pricePerBrick"
                  control={control}
                  rules={{ required: "Price is required", min: 0.01 }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price per Brick"
                      type="number"
                      step="0.01"
                      fullWidth
                      required
                      error={!!errors.pricePerBrick}
                      helperText={errors.pricePerBrick?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="HSN Code"
                  fullWidth
                  value={HSN_CODES.FLY_ASH_BRICKS}
                  disabled
                  helperText="HSN Code is static for fly ash bricks"
                />
              </Grid>

              <Divider sx={{ width: "100%", my: 2 }} />

              {/* Customer Information */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <PersonIcon sx={{ mr: 1 }} />
                  Customer Information
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useExistingCustomer}
                      onChange={(e) => setUseExistingCustomer(e.target.checked)}
                    />
                  }
                  label="Use existing customer"
                />
              </Grid>

              {useExistingCustomer && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={salesData.customers}
                    getOptionLabel={(option) =>
                      `${option.name} - ${option.phone}`
                    }
                    value={selectedCustomer}
                    onChange={(event, newValue) =>
                      handleCustomerSelect(newValue)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer"
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <Controller
                  name="customerName"
                  control={control}
                  rules={{ required: "Customer name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Customer Name"
                      fullWidth
                      required
                      error={!!errors.customerName}
                      helperText={errors.customerName?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                        ),
                      }}
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
                            <PhoneIcon />
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
                            <EmailIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="customerGSTIN"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="GSTIN (Optional)"
                      fullWidth
                      error={!!errors.customerGSTIN}
                      helperText={
                        errors.customerGSTIN?.message ||
                        "15-character GSTIN number"
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="customerAddress"
                  control={control}
                  rules={{ required: "Customer address is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Customer Address"
                      fullWidth
                      required
                      multiline
                      rows={3}
                      error={!!errors.customerAddress}
                      helperText={errors.customerAddress?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AddressIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="customerState"
                  control={control}
                  rules={{ required: "State is required" }}
                  render={({ field }) => (
                    <FormControl fullWidth required>
                      <InputLabel>State</InputLabel>
                      <Select
                        {...field}
                        label="State"
                        error={!!errors.customerState}
                      >
                        {Object.entries(INDIAN_STATES).map(([key, value]) => (
                          <MenuItem key={key} value={key}>
                            {value.name}
                          </MenuItem>
                        ))}
                      </Select>
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
                      helperText="Auto-filled based on selected state"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Divider sx={{ width: "100%", my: 2 }} />

              {/* Payment Information */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <MoneyIcon sx={{ mr: 1 }} />
                  Payment Information
                </Typography>
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
                        endAdornment: (
                          <InputAdornment position="end">
                            {watchDiscountType === "percentage" ? "%" : "$"}
                          </InputAdornment>
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
                        <MenuItem value="amount">Fixed Amount</MenuItem>
                        <MenuItem value="percentage">Percentage</MenuItem>
                      </Select>
                    </FormControl>
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
                        {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                          <MenuItem key={key} value={key}>
                            {value.label}
                          </MenuItem>
                        ))}
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
                      rows={2}
                      placeholder="Additional notes about this sale..."
                    />
                  )}
                />
              </Grid>

              {/* Enhanced Calculations Display */}
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <CalculateIcon sx={{ mr: 1 }} />
                    Amount Breakdown
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        Subtotal
                      </Typography>
                      <Typography variant="h6">
                        ${calculations.subtotal}
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        Discount
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        -${calculations.discountAmount}
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        Tax (GST)
                      </Typography>
                      <Typography variant="h6">
                        ${calculations.totalTax}
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        Total Amount
                      </Typography>
                      <Typography
                        variant="h5"
                        color="primary.main"
                        fontWeight="bold"
                      >
                        ${calculations.total}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* GST Breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      GST Breakdown:
                    </Typography>
                    <Grid container spacing={1}>
                      {parseFloat(calculations.cgstAmount) > 0 && (
                        <Grid item xs={4}>
                          <Chip
                            size="small"
                            label={`CGST (6%): ₹₹{calculations.cgstAmount}`}
                          />
                        </Grid>
                      )}
                      {parseFloat(calculations.sgstAmount) > 0 && (
                        <Grid item xs={4}>
                          <Chip
                            size="small"
                            label={`SGST (6%): ₹₹{calculations.sgstAmount}`}
                          />
                        </Grid>
                      )}
                      {parseFloat(calculations.igstAmount) > 0 && (
                        <Grid item xs={4}>
                          <Chip
                            size="small"
                            label={`IGST (12%): ₹₹{calculations.igstAmount}`}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Recording..." : "Record Sale"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sale Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Sale Details</DialogTitle>
        <DialogContent>
          {selectedSaleForDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Typography>
                  <strong>Invoice Number:</strong>{" "}
                  {selectedSaleForDetails.invoice_number}
                </Typography>
                <Typography>
                  <strong>Date:</strong>{" "}
                  {format(
                    new Date(selectedSaleForDetails.date),
                    "dd MMM yyyy, HH:mm"
                  )}
                </Typography>
                <Typography>
                  <strong>HSN Code:</strong>{" "}
                  {selectedSaleForDetails.hsn_code || "6815"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Customer Information
                </Typography>
                <Typography>
                  <strong>Name:</strong> {selectedSaleForDetails.customer_name}
                </Typography>
                <Typography>
                  <strong>Phone:</strong>{" "}
                  {selectedSaleForDetails.customer_phone}
                </Typography>
                {selectedSaleForDetails.customer_email && (
                  <Typography>
                    <strong>Email:</strong>{" "}
                    {selectedSaleForDetails.customer_email}
                  </Typography>
                )}
                <Typography>
                  <strong>Address:</strong>{" "}
                  {selectedSaleForDetails.customer_address}
                </Typography>
                <Typography>
                  <strong>State:</strong>{" "}
                  {selectedSaleForDetails.customer_state} (
                  {selectedSaleForDetails.customer_state_code})
                </Typography>
                {selectedSaleForDetails.customer_gstin && (
                  <Typography>
                    <strong>GSTIN:</strong>{" "}
                    {selectedSaleForDetails.customer_gstin}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Product Details
                </Typography>
                <Typography>
                  <strong>Quantity:</strong>{" "}
                  {formatNumber(selectedSaleForDetails.quantity)} bricks
                </Typography>
                <Typography>
                  <strong>Rate:</strong>{" "}
                  {formatCurrency(selectedSaleForDetails.price_per_brick)} per
                  brick
                </Typography>
                <Typography>
                  <strong>Payment Method:</strong>{" "}
                  {
                    PAYMENT_METHODS[selectedSaleForDetails.payment_method]
                      ?.label
                  }
                </Typography>
                {selectedSaleForDetails.notes && (
                  <Typography>
                    <strong>Notes:</strong> {selectedSaleForDetails.notes}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>
                  Amount Breakdown
                </Typography>
                <Typography>
                  Subtotal:{" "}
                  {formatCurrency(
                    selectedSaleForDetails.quantity *
                      selectedSaleForDetails.price_per_brick
                  )}
                </Typography>
                <Typography>
                  Discount:{" "}
                  {formatCurrency(selectedSaleForDetails.discount_amount || 0)}
                </Typography>
                <Typography>
                  Tax (GST):{" "}
                  {formatCurrency(selectedSaleForDetails.total_tax || 0)}
                </Typography>
                <Typography>
                  <strong>
                    Total Amount:{" "}
                    {formatCurrency(selectedSaleForDetails.total_amount || 0)}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setDetailsDialogOpen(false);
              handleViewInvoice(selectedSaleForDetails);
            }}
            startIcon={<ReceiptIcon />}
          >
            View Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* GST Invoice Viewer */}
      <GSTInvoiceViewer
        open={invoiceViewerOpen}
        onClose={() => setInvoiceViewerOpen(false)}
        saleData={selectedSaleForDetails}
      />
    </Box>
  );
}

export default Sales;
