import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress,
} from "@mui/material";
import {
  Factory as FactoryIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// Import contexts
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";

// Import services
import { productionService } from "../services/productionService";
import { salesService } from "../services/salesService";

// Import components
import StatsCard from "../components/dashboard/StatsCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";

function Dashboard() {
  const navigate = useNavigate();
  const { actions: appActions } = useApp();
  const {
    bricks,
    cement,
    lowStockAlerts,
    inventoryValue,
    isLoading: inventoryLoading,
    actions: inventoryActions,
  } = useInventory();

  // Dashboard state
  const [dashboardData, setDashboardData] = useState({
    todayProduction: { quantity: 0, efficiency: 0 },
    todaySales: { quantity: 0, revenue: 0 },
    monthlyStats: { production: 0, sales: 0, revenue: 0 },
    recentActivity: [],
    loading: true,
    error: null,
  });

  const [refreshing, setRefreshing] = useState(false);

  const calculateActualBrickStock = async () => {
  try {
    console.log("🧮 Calculating actual brick stock...");
    
    // ✅ Use correct service method names from your codebase
    const [productionResult, salesResult] = await Promise.all([
      productionService.getProductionHistory(1000), // ✅ This method exists
      salesService.getAllSales(), // ✅ This method exists
    ]);

    console.log("📊 Service Results:", {
      productionSuccess: productionResult.success,
      productionDataLength: productionResult.data?.length,
      salesSuccess: salesResult.success,
      salesDataLength: salesResult.data?.length,
    });

    // Calculate total production
    let totalProduction = 0;
    if (productionResult.success && productionResult.data) {
      totalProduction = productionResult.data.reduce((sum, production) => {
        return sum + (parseInt(production.quantity) || 0);
      }, 0);
    }

    // Calculate total sales
    let totalSales = 0;
    if (salesResult.success && salesResult.data) {
      totalSales = salesResult.data.reduce((sum, sale) => {
        return sum + (parseInt(sale.quantity) || 0);
      }, 0);
    }

    // Calculate actual brick stock
    const actualBrickStock = totalProduction - totalSales;

    console.log("📈 Calculation Results:", {
      totalProduction: totalProduction.toLocaleString(),
      totalSales: totalSales.toLocaleString(),
      actualBrickStock: actualBrickStock.toLocaleString(),
    });

    return {
      success: true,
      data: {
        calculated_stock: actualBrickStock,
        total_production: totalProduction,
        total_sales: totalSales,
        last_calculated: new Date().toISOString(),
      }
    };

  } catch (error) {
    console.error("❌ Error calculating brick stock:", error);
    return {
      success: false,
      error: error.message,
      data: { calculated_stock: 0 }
    };
  }
};


  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);
  //   try {
  //     setDashboardData((prev) => ({ ...prev, loading: true, error: null }));

  //     const today = new Date().toISOString().split("T")[0];
  //     const currentMonth = today.substring(0, 7);
  //     const currentYear = new Date().getFullYear();

  //     console.log("🔍 Dashboard Debug - Loading data for:", {
  //       today,
  //       currentMonth,
  //       currentYear,
  //     });

  //     // Fetch data in parallel
  //     const [
  //       todayProductionResult,
  //       todaySalesResult,
  //       monthlyProductionResult,
  //       monthlySalesResult,
  //       productionStatsResult,
  //       salesStatsResult,
  //     ] = await Promise.all([
  //       productionService.getProductionByDate(today),
  //       salesService.getDailySales(today),
  //       productionService.getMonthlyProduction(currentYear), // ✅ Pass year instead of month
  //       salesService.getMonthlySales(currentMonth),
  //       productionService.getProductionStats("month"),
  //       salesService.getSalesStats("month"),
  //     ]);

  //     console.log("📊 Dashboard Debug - Raw Results:", {
  //       todayProduction: todayProductionResult,
  //       todaySales: todaySalesResult,
  //       monthlyProduction: monthlyProductionResult,
  //       monthlySales: monthlySalesResult,
  //     });

  //     // Process today's data
  //     const todayProduction =
  //       todayProductionResult.success && todayProductionResult.data
  //         ? todayProductionResult.data
  //         : { quantity: 0, efficiency: 0, cement_used: 0 };

  //     const todaySales =
  //       todaySalesResult.success && todaySalesResult.data
  //         ? todaySalesResult.data
  //         : { total_quantity: 0, total_revenue: 0, transactions_count: 0 };

  //     // ✅ FIXED: Process monthly production data correctly
  //     let monthlyProduction = { total_quantity: 0, total_production: 0 };

  //     if (monthlyProductionResult.success && monthlyProductionResult.data) {
  //       // The data comes as { "2025-01": { total_quantity: 100, ... }, "2025-02": { ... } }
  //       // We need to get the current month's data
  //       const currentMonthData = monthlyProductionResult.data[currentMonth];

  //       if (currentMonthData) {
  //         monthlyProduction = {
  //           total_quantity: currentMonthData.total_quantity || 0,
  //           total_production: currentMonthData.total_quantity || 0, // Use same value
  //           total_cement_used: currentMonthData.total_cement_used || 0,
  //           days_count: currentMonthData.days_count || 0,
  //           average_efficiency: currentMonthData.average_efficiency || 0,
  //         };
  //       }
  //     }

  //     const monthlySales =
  //       monthlySalesResult.success && monthlySalesResult.data
  //         ? monthlySalesResult.data
  //         : { total_quantity: 0, total_revenue: 0, transactions_count: 0 };

  //     console.log("📈 Dashboard Debug - Processed Data:", {
  //       todayProduction,
  //       todaySales,
  //       monthlyProduction,
  //       monthlySales,
  //     });

  //     // Create recent activity from stats
  //     const recentActivity = [
  //       // Today's production activity
  //       ...(todayProduction.quantity > 0
  //         ? [
  //             {
  //               id: `production_${today}`,
  //               type: "production",
  //               description: `Produced ${todayProduction.quantity.toLocaleString()} bricks today`,
  //               timestamp: Date.now(),
  //               status: "success",
  //             },
  //           ]
  //         : []),

  //       // Today's sales activity
  //       ...(todaySales.total_quantity > 0
  //         ? [
  //             {
  //               id: `sales_${today}`,
  //               type: "sale",
  //               description: `Sold ${todaySales.total_quantity.toLocaleString()} bricks for ₹${todaySales.total_revenue.toLocaleString()}`,
  //               timestamp: Date.now() - 1000,
  //               status: "success",
  //             },
  //           ]
  //         : []),

  //       // Stock alerts
  //       ...(lowStockAlerts.bricks
  //         ? [
  //             {
  //               id: "alert_bricks",
  //               type: "alert",
  //               description: "Low brick stock alert",
  //               timestamp: Date.now() - 2000,
  //               status: "warning",
  //             },
  //           ]
  //         : []),

  //       ...(lowStockAlerts.cement
  //         ? [
  //             {
  //               id: "alert_cement",
  //               type: "alert",
  //               description: "Low cement stock alert",
  //               timestamp: Date.now() - 3000,
  //               status: "warning",
  //             },
  //           ]
  //         : []),

  //       // Monthly milestone
  //       ...(monthlySales.total_quantity > 1000
  //         ? [
  //             {
  //               id: "milestone_monthly",
  //               type: "milestone",
  //               description: `Monthly sales milestone: ${monthlySales.total_quantity.toLocaleString()} bricks sold`,
  //               timestamp: Date.now() - 4000,
  //               status: "info",
  //             },
  //           ]
  //         : []),
  //     ].slice(0, 5); // Limit to 5 most recent

  //     const finalDashboardData = {
  //       todayProduction: {
  //         quantity: todayProduction.quantity || 0,
  //         efficiency: todayProduction.efficiency || 0,
  //         cement_used: todayProduction.cement_used || 0,
  //       },
  //       todaySales: {
  //         quantity: todaySales.total_quantity || 0,
  //         revenue: todaySales.total_revenue || 0,
  //         transactions: todaySales.transactions_count || 0,
  //       },
  //       monthlyStats: {
  //         production: monthlyProduction.total_quantity || 0, // ✅ This should now work
  //         sales: monthlySales.total_quantity || 0,
  //         revenue: monthlySales.total_revenue || 0,
  //         transactions: monthlySales.transactions_count || 0,
  //       },
  //       recentActivity,
  //       loading: false,
  //       error: null,
  //     };

  //     console.log("✅ Dashboard Debug - Final Data:", finalDashboardData);

  //     setDashboardData(finalDashboardData);
  //   } catch (error) {
  //     console.error("❌ Dashboard Debug - Error loading data:", error);
  //     setDashboardData((prev) => ({
  //       ...prev,
  //       loading: false,
  //       error: "Failed to load dashboard data",
  //     }));
  //     appActions.showNotification("Failed to load dashboard data", "error");
  //   }
  // };

  // Handle refresh
  
  const loadDashboardData = async () => {
  try {
    setDashboardData((prev) => ({ ...prev, loading: true, error: null }));

    const today = new Date().toISOString().split("T")[0];

    console.log("🔍 Dashboard Debug - Loading data for:", { today });

    // ✅ Use the EXACT same service calls as the individual component pages
    const [
      // Production calls - same as Production.js
      todayProductionResult,
      productionStatsResult,
      
      // Sales calls - same as Sales.js  
      todaySalesResult,
      salesStatsResult,
      
      calculatedStockResult,
      // Note: Inventory data comes from useInventory context (already working correctly)
    ] = await Promise.all([
      // Production - same as Production.js
      productionService.getProductionByDate(today),
      productionService.getProductionStats("month"),
      
      // Sales - same as Sales.js
      salesService.getDailySales(today),
      salesService.getSalesStats("month"),

      calculateActualBrickStock(),
    ]);

    console.log("📊 Dashboard Debug - Raw Results:", {
      todayProduction: todayProductionResult,
      productionStats: productionStatsResult,
      todaySales: todaySalesResult,
      salesStats: salesStatsResult,
    });

    // ✅ Process data exactly like the individual components do
    
    // Today's Production (same as Production.js)
    const todayProduction = todayProductionResult.success && todayProductionResult.data
      ? todayProductionResult.data
      : { quantity: 0, efficiency: 0, cement_used: 0 };

    // Today's Sales (same as Sales.js)
    const todaySales = todaySalesResult.success && todaySalesResult.data
      ? todaySalesResult.data
      : { total_quantity: 0, total_revenue: 0, transactions_count: 0 };

    // Monthly Production Stats (same as Production.js)
    const productionStats = productionStatsResult.success && productionStatsResult.data
      ? productionStatsResult.data
      : { total_quantity: 0, total_cement_used: 0, average_efficiency: 0 };

    // Monthly Sales Stats (same as Sales.js)
    const salesStats = salesStatsResult.success && salesStatsResult.data
      ? salesStatsResult.data
      : { total_quantity: 0, total_revenue: 0, total_sales: 0, total_transactions: 0 };


    // ✅ ADD calculated stock processing
    const calculatedStock = calculatedStockResult.success && calculatedStockResult.data
      ? calculatedStockResult.data.calculated_stock
      : 0;

    console.log("📈 Dashboard Debug - Processed Data:", {
      todayProduction,
      todaySales,
      productionStats,
      salesStats,
    });

    // Create recent activity from stats
    const recentActivity = [
      // Today's production activity
      ...(todayProduction.quantity > 0
        ? [
            {
              id: `production_${today}`,
              type: "production",
              description: `Produced ${todayProduction.quantity.toLocaleString()} bricks today`,
              timestamp: Date.now(),
              status: "success",
            },
          ]
        : []),

      // Today's sales activity
      ...(todaySales.total_quantity > 0
        ? [
            {
              id: `sales_${today}`,
              type: "sale",
              description: `Sold ${todaySales.total_quantity.toLocaleString()} bricks for ₹${todaySales.total_revenue.toLocaleString()}`,
              timestamp: Date.now() - 1000,
              status: "success",
            },
          ]
        : []),

      // Stock alerts (from useInventory context)
      ...(lowStockAlerts.bricks
        ? [
            {
              id: "alert_bricks",
              type: "alert",
              description: "Low brick stock alert",
              timestamp: Date.now() - 2000,
              status: "warning",
            },
          ]
        : []),

      ...(lowStockAlerts.cement
        ? [
            {
              id: "alert_cement",
              type: "alert",
              description: "Low cement stock alert",
              timestamp: Date.now() - 3000,
              status: "warning",
            },
          ]
        : []),

      // Monthly milestone (using same logic as Sales.js)
      ...(salesStats.total_quantity > 1000
        ? [
            {
              id: "milestone_monthly",
              type: "milestone",
              description: `Monthly sales milestone: ${salesStats.total_quantity.toLocaleString()} bricks sold`,
              timestamp: Date.now() - 4000,
              status: "info",
            },
          ]
        : []),
    ].slice(0, 5); // Limit to 5 most recent

    // ✅ Create final dashboard data using same field names as individual components
    const finalDashboardData = {
      todayProduction: {
        quantity: todayProduction.quantity || 0,
        efficiency: todayProduction.efficiency || 0,
        cement_used: todayProduction.cement_used || 0,
      },
      todaySales: {
        quantity: todaySales.total_quantity || 0,
        revenue: todaySales.total_revenue || 0,
        transactions: todaySales.transactions_count || 0,
      },
      monthlyStats: {
        // Production stats - same as Production.js
        production: productionStats.total_quantity || 0,
        
        // Sales stats - same as Sales.js (using total_sales field like Sales.js does)
        sales: salesStats.total_quantity || 0,
        revenue: salesStats.total_sales || salesStats.total_revenue || 0, // Use total_sales like Sales.js
        transactions: salesStats.total_transactions || 0,
      },
      calculatedBrickStock: calculatedStock,
      recentActivity,
      loading: false,
      error: null,
    };

    console.log("✅ Dashboard Debug - Final Data:", finalDashboardData);

    setDashboardData(finalDashboardData);
  } catch (error) {
    console.error("❌ Dashboard Debug - Error loading data:", error);
    setDashboardData((prev) => ({
      ...prev,
      loading: false,
      error: "Failed to load dashboard data",
    }));
    appActions.showNotification("Failed to load dashboard data", "error");
  }
};
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboardData(),
        inventoryActions.refreshInventory(),
      ]);
      appActions.showNotification(
        "Dashboard refreshed successfully",
        "success"
      );
    } catch (error) {
      appActions.showNotification("Failed to refresh dashboard", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate stock status
  const getStockStatus = () => {
    const alerts = [];
    if (lowStockAlerts.bricks) {
      alerts.push("Bricks running low");
    }
    if (lowStockAlerts.cement) {
      alerts.push("Cement running low");
    }
    return alerts;
  };

  const stockAlerts = getStockStatus();
  const hasAlerts = stockAlerts.length > 0;

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
            Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Welcome back! Here's what's happening with your brick production
            today.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh dashboard">
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
      {(dashboardData.loading || inventoryLoading || refreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Alerts */}
      {hasAlerts && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate("/inventory")}
            >
              View Inventory
            </Button>
          }
          icon={<WarningIcon />}
        >
          <Typography variant="subtitle2" gutterBottom>
            Stock Alerts
          </Typography>
          {stockAlerts.map((alert, index) => (
            <Typography key={index} variant="body2">
              • {alert}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Error message */}
      {dashboardData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {dashboardData.error}
        </Alert>
      )}

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Brick Inventory */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Brick Stock
                  </Typography>
                  <Typography variant="h5" component="div">
                    {dashboardData?.calculatedBrickStock?.toLocaleString() || "0"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total bricks available
                  </Typography>
                  {lowStockAlerts.bricks && (
                    <Typography variant="caption" color="error.main">
                      Low stock alert
                    </Typography>
                  )}
                </Box>
                <InventoryIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cement Inventory */}
        <Grid item xs={12} sm={6} md={3}>
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
                    Cement Stock
                  </Typography>
                  <Typography variant="h5" component="div">
                    {cement?.total_bags?.toLocaleString() || "0"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bags available
                  </Typography>
                  {lowStockAlerts.cement && (
                    <Typography variant="caption" color="error.main">
                      Low stock alert
                    </Typography>
                  )}
                </Box>
                <InventoryIcon color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Production */}
        <Grid item xs={12} sm={6} md={3}>
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
                    {dashboardData.todayProduction.quantity.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks produced
                  </Typography>
                  {dashboardData.todayProduction.efficiency > 0 && (
                    <Typography variant="caption" color="success.main">
                      {dashboardData.todayProduction.efficiency}% efficiency
                    </Typography>
                  )}
                </Box>
                <FactoryIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Sales */}
        <Grid item xs={12} sm={6} md={3}>
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
                    {dashboardData.todaySales.quantity.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks sold
                  </Typography>
                  {dashboardData.todaySales.revenue > 0 && (
                    <Typography variant="caption" color="primary.main">
                      ₹{dashboardData.todaySales.revenue.toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <ShoppingCartIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Overview Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Production */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "120px", // Fixed height for consistency
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
                    {dashboardData.monthlyStats.production.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks produced this month
                  </Typography>
                  {dashboardData.monthlyStats.production > 0 && (
                    <Typography variant="caption" color="success.main">
                      Active production
                    </Typography>
                  )}
                </Box>
                <TrendingUpIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Sales */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "120px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Monthly Sales
                  </Typography>
                  <Typography variant="h5" component="div">
                    {dashboardData.monthlyStats.sales.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Bricks sold this month
                  </Typography>
                  {dashboardData.monthlyStats.transactions > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      {dashboardData.monthlyStats.transactions} transactions
                    </Typography>
                  )}
                </Box>
                <ShoppingCartIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Revenue */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  height: "120px", // Fixed height for consistency
                }}
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                  >
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" component="div">
                    ₹{dashboardData.monthlyStats.revenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total earnings this month
                  </Typography>
                  {dashboardData.monthlyStats.sales > 0 && (
                    <Typography variant="caption" color="success.main">
                      ₹
                      {Math.round(
                        dashboardData.monthlyStats.revenue /
                          dashboardData.monthlyStats.sales
                      )}{" "}
                      per brick
                    </Typography>
                  )}
                </Box>
                <TrendingUpIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Cards and Recent Activity */}
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <QuickActions />
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <RecentActivity activities={dashboardData.recentActivity} />
        </Grid>
      </Grid>

      {/* Inventory Value Summary */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Value Summary
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Brick Value
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ${inventoryValue?.brickValue || "0.00"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Cement Value
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ${inventoryValue?.cementValue || "0.00"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Value
                    </Typography>
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      ${inventoryValue?.totalValue || "0.00"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
