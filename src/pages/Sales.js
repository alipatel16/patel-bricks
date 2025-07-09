// Sales.js - Updated to use separated components with original design
import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Fab,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as RevenueIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";

// Import contexts and services
import { useInventory } from "../context/InventoryContext";
import { useSales } from "../hooks/useSales";

// Import separated components
import SalesHistory from "../components/sales/SalesHistory";
import CustomerList from "../components/sales/CustomerList";
import RecordSaleDialog from "../components/sales/RecordSaleDialog";

// Import components
import GSTInvoiceViewer from "../components/sales/GSTInvoiceViewer";

// Import utilities
import {
  validateSaleCapacity,
  formatCurrency,
  formatQuantity,
  validateSaleData,
} from "../utils/calculations";
import {
  HSN_CODES,
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

  const { bricks, actions: inventoryActions } = useInventory();
  const {
    sales,
    recordSale,
    loadSalesData,
    searchCustomers,
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
      
      toast.error("Failed to refresh sales data");
    } finally {
      setRefreshing(false);
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

        // GST details
        includeGST: data.includeGST || false,
        
        // Add calculated amounts for reference
        calculatedAmounts: calculatedAmounts,
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
          
          // Continue anyway - sale was successful
        }

        handleCloseDialog();
      }
    } catch (error) {
      
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
        <SalesHistory
          sales={sales}
          isLoading={isLoading}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
          filteredSales={filteredSales}
          onViewInvoice={handleViewInvoice}
        />
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
        <CustomerList
          sales={sales}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
        />
      </TabPanel>

      {/* Record Sale Dialog */}
      <RecordSaleDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={onSubmit}
        isLoading={isLoading}
        bricks={bricks}
        customerOptions={customerOptions}
        setCustomerOptions={setCustomerOptions}
        locationOptions={locationOptions}
        setLocationOptions={setLocationOptions}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        customerSearchLoading={customerSearchLoading}
        setCustomerSearchLoading={setCustomerSearchLoading}
        calculatedAmounts={calculatedAmounts}
        setCalculatedAmounts={setCalculatedAmounts}
        searchCustomers={searchCustomers}
      />

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