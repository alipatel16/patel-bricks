import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Import contexts
import { useApp } from "../context/AppContext";
import { useInventory } from "../context/InventoryContext";

// Import services
import { productionService } from "../services/productionService";
import { salesService } from "../services/salesService";

// Import utilities
import { CHART_COLORS, REPORT_TYPES } from "../utils/constants";

// Helper function for date operations
const getPreviousPeriod = (period) => {
  // Simple implementation for now
  return period;
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Reports() {
  const { actions: appActions } = useApp();
  const { inventoryValue } = useInventory();

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [reportPeriod, setReportPeriod] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const [reportsData, setReportsData] = useState({
    production: {
      data: [],
      stats: null,
      trends: [],
      loading: false,
      error: null,
    },
    sales: {
      data: [],
      stats: null,
      trends: [],
      loading: false,
      error: null,
    },
    financial: {
      revenue: [],
      profit: [],
      costs: [],
      loading: false,
      error: null,
    },
    summary: {
      overview: null,
      comparison: null,
      loading: false,
      error: null,
    },
  });

  // Load reports data on mount and when period changes
  useEffect(() => {
    loadReportsData();
  }, [reportPeriod]);

  // Load all reports data
  const loadReportsData = async () => {
    try {
      setReportsData((prev) => ({
        ...prev,
        production: { ...prev.production, loading: true },
        sales: { ...prev.sales, loading: true },
        financial: { ...prev.financial, loading: true },
        summary: { ...prev.summary, loading: true },
      }));

      const [
        productionStatsResult,
        productionTrendsResult,
        salesStatsResult,
        salesTrendsResult,
        productionHistoryResult,
        salesHistoryResult,
      ] = await Promise.all([
        productionService.getProductionStats(reportPeriod),
        productionService.getProductionTrends(getPeriodDays(reportPeriod)),
        salesService.getSalesStats(reportPeriod),
        salesService.getSalesTrends(getPeriodDays(reportPeriod)),
        productionService.getProductionHistory(100),
        salesService.getSalesHistory(100),
      ]);

      // Process production data
      const productionData = {
        data: productionHistoryResult.success
          ? productionHistoryResult.data
          : [],
        stats: productionStatsResult.success
          ? productionStatsResult.data
          : null,
        trends: productionTrendsResult.success
          ? productionTrendsResult.data.daily_production
          : [],
        loading: false,
        error: productionStatsResult.success
          ? null
          : "Failed to load production data",
      };

      // Process sales data
      const salesData = {
        data: salesHistoryResult.success ? salesHistoryResult.data : [],
        stats: salesStatsResult.success ? salesStatsResult.data : null,
        trends: salesTrendsResult.success
          ? salesTrendsResult.data.daily_sales
          : [],
        loading: false,
        error: salesStatsResult.success ? null : "Failed to load sales data",
      };

      // Process financial data
      const financialData = {
        revenue: salesData.trends.map((day) => ({
          date: day.date,
          revenue: day.total_revenue,
          transactions: day.transactions_count,
        })),
        profit: [], // Would need cost data for profit calculation
        costs: [], // Would need detailed cost tracking
        loading: false,
        error: null,
      };

      // Create summary overview
      const summaryData = {
        overview: {
          totalProduction: productionData.stats?.total_quantity || 0,
          totalSales: salesData.stats?.total_quantity || 0,
          totalRevenue: salesData.stats?.total_revenue || 0,
          inventoryValue: parseFloat(inventoryValue?.totalValue || 0),
          averagePrice: salesData.stats?.average_price_per_brick || 0,
          efficiency: productionData.stats?.average_efficiency || 0,
        },
        comparison: calculatePeriodComparison(
          productionData.stats,
          salesData.stats
        ),
        loading: false,
        error: null,
      };

      setReportsData({
        production: productionData,
        sales: salesData,
        financial: financialData,
        summary: summaryData,
      });
    } catch (error) {
      console.error("Error loading reports data:", error);
      appActions.showNotification("Failed to load reports data", "error");

      setReportsData((prev) => ({
        production: {
          ...prev.production,
          loading: false,
          error: "Failed to load data",
        },
        sales: { ...prev.sales, loading: false, error: "Failed to load data" },
        financial: {
          ...prev.financial,
          loading: false,
          error: "Failed to load data",
        },
        summary: {
          ...prev.summary,
          loading: false,
          error: "Failed to load data",
        },
      }));
    }
  };

  // Helper functions
  const getPeriodDays = (period) => {
    switch (period) {
      case "week":
        return 7;
      case "month":
        return 30;
      case "quarter":
        return 90;
      case "year":
        return 365;
      default:
        return 30;
    }
  };

  const calculatePeriodComparison = (productionStats, salesStats) => {
    // This would ideally compare with previous period data
    // For now, return placeholder data
    return {
      productionChange: "+12%",
      salesChange: "+8%",
      revenueChange: "+15%",
      efficiencyChange: "+5%",
    };
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle period change
  const handlePeriodChange = (event) => {
    setReportPeriod(event.target.value);
  };

  // Handle export
  const handleExport = (format) => {
    appActions.showNotification(
      `Export to ${format.toUpperCase()} feature coming soon`,
      "info"
    );
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  const combineProductionSalesData = (productionTrends, salesTrends) => {
    // Create a Map to store combined data by date
    const combinedData = new Map();

    // Add production data
    if (productionTrends && Array.isArray(productionTrends)) {
      productionTrends.forEach((item) => {
        const date = item.date;
        combinedData.set(date, {
          date: date,
          production: item.quantity || 0,
          productionCement: item.cement_used || 0,
          sales: 0,
          salesRevenue: 0,
        });
      });
    }

    // Add sales data
    if (salesTrends && Array.isArray(salesTrends)) {
      salesTrends.forEach((item) => {
        const date = item.date;
        if (combinedData.has(date)) {
          // Update existing entry
          const existing = combinedData.get(date);
          existing.sales = item.total_quantity || 0;
          existing.salesRevenue = item.total_revenue || 0;
        } else {
          // Create new entry
          combinedData.set(date, {
            date: date,
            production: 0,
            productionCement: 0,
            sales: item.total_quantity || 0,
            salesRevenue: item.total_revenue || 0,
          });
        }
      });
    }

    // Convert to array and sort by date
    return Array.from(combinedData.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    // Handle NaN, null, undefined, and non-numeric values
    const numericAmount = parseFloat(amount) || 0;

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  // Chart color scheme
  const chartColors = [
    CHART_COLORS.PRIMARY,
    CHART_COLORS.SECONDARY,
    CHART_COLORS.SUCCESS,
    CHART_COLORS.WARNING,
    CHART_COLORS.ERROR,
    CHART_COLORS.INFO,
  ];

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
            Reports & Analytics
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Analyze your brick production business performance and trends
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={reportPeriod}
              label="Period"
              onChange={handlePeriodChange}
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh data">
            <IconButton onClick={loadReportsData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Print report">
            <IconButton onClick={handlePrint}>
              <PrintIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("pdf")}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Loading indicator */}
      {(reportsData.summary.loading ||
        reportsData.production.loading ||
        reportsData.sales.loading) && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary Cards */}
      {reportsData.summary.overview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="overline"
                    >
                      Total Production
                    </Typography>
                    <Typography variant="h5" component="div">
                      {reportsData.summary.overview.totalProduction.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Bricks produced
                    </Typography>
                  </Box>
                  <Chip
                    label={reportsData.summary.comparison.productionChange}
                    color="success"
                    size="small"
                    icon={<TrendingUpIcon />}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="overline"
                    >
                      Total Sales
                    </Typography>
                    <Typography variant="h5" component="div">
                      {reportsData.summary.overview.totalSales.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Bricks sold
                    </Typography>
                  </Box>
                  <Chip
                    label={reportsData.summary.comparison.salesChange}
                    color="success"
                    size="small"
                    icon={<TrendingUpIcon />}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="overline"
                    >
                      Total Revenue
                    </Typography>
                    <Typography variant="h5" component="div">
                      {formatCurrency(
                        reportsData.summary.overview.totalRevenue
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Revenue generated
                    </Typography>
                  </Box>
                  <Chip
                    label={reportsData.summary.comparison.revenueChange}
                    color="success"
                    size="small"
                    icon={<TrendingUpIcon />}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="overline"
                    >
                      Inventory Value
                    </Typography>
                    <Typography variant="h5" component="div">
                      {formatCurrency(
                        reportsData.summary.overview.inventoryValue
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Current inventory
                    </Typography>
                  </Box>
                  <AssessmentIcon color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Report Tabs */}
      <Card sx={{ padding: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Production Report" />
            <Tab label="Sales Report" />
            <Tab label="Financial Report" />
            <Tab label="Comparative Analysis" />
          </Tabs>
        </Box>

        {/* Production Report Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            {/* Production Trend Chart */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Production Trend
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportsData.production.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <RechartsTooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="quantity"
                      stroke={CHART_COLORS.PRIMARY}
                      strokeWidth={2}
                      name="Bricks Produced"
                    />
                    <Line
                      type="monotone"
                      dataKey="cement_used"
                      stroke={CHART_COLORS.WARNING}
                      strokeWidth={2}
                      name="Cement Used (bags)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Production Stats */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Production Statistics
              </Typography>
              {reportsData.production.stats ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Production</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {reportsData.production.stats.total_quantity.toLocaleString()}{" "}
                          bricks
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Production Days</TableCell>
                        <TableCell align="right">
                          {reportsData.production.stats.production_days} days
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Daily Production</TableCell>
                        <TableCell align="right">
                          {
                            reportsData.production.stats
                              .average_daily_production
                          }{" "}
                          bricks/day
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Cement Used</TableCell>
                        <TableCell align="right">
                          {reportsData.production.stats.total_cement_used} bags
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Efficiency</TableCell>
                        <TableCell align="right">
                          {reportsData.production.stats.average_efficiency}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Best Production Day</TableCell>
                        <TableCell align="right">
                          {reportsData.production.stats.best_day?.quantity || 0}{" "}
                          bricks
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No production statistics available
                </Alert>
              )}
            </Grid>

            {/* Production by Quality */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Production by Quality Grade
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                {reportsData.production.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Grade A",
                            value: 30,
                            fill: CHART_COLORS.SUCCESS,
                          },
                          {
                            name: "Grade B",
                            value: 60,
                            fill: CHART_COLORS.PRIMARY,
                          },
                          {
                            name: "Grade C",
                            value: 10,
                            fill: CHART_COLORS.WARNING,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: "center", pt: 4 }}>
                    <Typography color="textSecondary">
                      No quality data available
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Sales Report Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            {/* Sales Trend Chart */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Sales Trend
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportsData.sales.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <RechartsTooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total_quantity"
                      stackId="1"
                      stroke={CHART_COLORS.PRIMARY}
                      fill={CHART_COLORS.PRIMARY}
                      name="Bricks Sold"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Sales Stats */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Sales Statistics
              </Typography>
              {reportsData.sales.stats ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Sales</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {reportsData.sales.stats.total_quantity.toLocaleString()}{" "}
                          bricks
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Revenue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(
                            reportsData.sales.stats.total_revenue
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Transactions</TableCell>
                        <TableCell align="right">
                          {reportsData.sales.stats.total_transactions}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Transaction Value</TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            reportsData.sales.stats.average_transaction_value
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Price per Brick</TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            reportsData.sales.stats.average_price_per_brick
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Best Sale</TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            reportsData.sales.stats.best_sale?.total_amount || 0
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No sales statistics available</Alert>
              )}
            </Grid>

            {/* Revenue Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Daily Revenue
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportsData.financial.revenue.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis />
                    <RechartsTooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill={CHART_COLORS.SUCCESS}
                      name="Daily Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Financial Report Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                Detailed financial reporting requires cost tracking and profit
                analysis features. This section will be enhanced in future
                updates.
              </Alert>
            </Grid>

            {/* Revenue Overview */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Overview
                  </Typography>
                  <Typography
                    variant="h4"
                    color="success.main"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {formatCurrency(
                      reportsData.summary.overview?.totalRevenue || 0
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total revenue this {reportPeriod}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Cost Analysis Placeholder */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cost Analysis
                  </Typography>
                  <Typography
                    variant="h4"
                    color="warning.main"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Coming Soon
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Detailed cost tracking
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Profit Analysis Placeholder */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Profit Analysis
                  </Typography>
                  <Typography
                    variant="h4"
                    color="primary.main"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Coming Soon
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Profit margin analysis
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Comparative Analysis Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Performance Comparison
              </Typography>
            </Grid>

            {/* Production vs Sales Chart */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Production vs Sales Comparison
                </Typography>
                {(() => {
                  const combinedData = combineProductionSalesData(
                    reportsData.production.trends,
                    reportsData.sales.trends
                  );

                  return combinedData && combinedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => {
                            try {
                              return new Date(value).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              );
                            } catch {
                              return value;
                            }
                          }}
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <RechartsTooltip
                          labelFormatter={(value) => {
                            try {
                              return new Date(value).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              );
                            } catch {
                              return value;
                            }
                          }}
                          formatter={(value, name) => [
                            value.toLocaleString(),
                            name === "production"
                              ? "Bricks Produced"
                              : name === "sales"
                              ? "Bricks Sold"
                              : name,
                          ]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="production"
                          stroke={CHART_COLORS.PRIMARY}
                          strokeWidth={2}
                          name="Production"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke={CHART_COLORS.SUCCESS}
                          strokeWidth={2}
                          name="Sales"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "80%",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Typography variant="h6" color="textSecondary">
                        No Comparison Data Available
                      </Typography>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        textAlign="center"
                      >
                        Production and sales comparison will appear here once
                        you have recorded
                        <br />
                        both production and sales data for the same time period
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadReportsData}
                        size="small"
                      >
                        Refresh Data
                      </Button>
                    </Box>
                  );
                })()}
              </Paper>
            </Grid>

            {/* Production vs Sales Summary Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <Typography
                        variant="h4"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      >
                        {(
                          reportsData.production.stats?.total_quantity || 0
                        ).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Production
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {reportPeriod} period
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <Typography
                        variant="h4"
                        color="success.main"
                        sx={{ fontWeight: 600 }}
                      >
                        {(
                          reportsData.sales.stats?.total_quantity || 0
                        ).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Sales
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {reportPeriod} period
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <Typography
                        variant="h4"
                        color={
                          (reportsData.production.stats?.total_quantity || 0) >=
                          (reportsData.sales.stats?.total_quantity || 0)
                            ? "success.main"
                            : "warning.main"
                        }
                        sx={{ fontWeight: 600 }}
                      >
                        {(
                          (reportsData.production.stats?.total_quantity || 0) -
                          (reportsData.sales.stats?.total_quantity || 0)
                        ).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Inventory Change
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Production - Sales
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <Typography
                        variant="h4"
                        color="info.main"
                        sx={{ fontWeight: 600 }}
                      >
                        {reportsData.sales.stats?.total_quantity > 0
                          ? Math.round(
                              (reportsData.sales.stats.total_quantity /
                                (reportsData.production.stats?.total_quantity ||
                                  1)) *
                                100
                            )
                          : 0}
                        %
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Sales Rate
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Sales / Production
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Key Metrics Comparison */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Key Metrics Comparison
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Production</TableCell>
                      <TableCell align="right">Sales</TableCell>
                      <TableCell align="right">Difference</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Quantity</TableCell>
                      <TableCell align="right">
                        {(
                          reportsData.production.stats?.total_quantity || 0
                        ).toLocaleString()}{" "}
                        bricks
                      </TableCell>
                      <TableCell align="right">
                        {(
                          reportsData.sales.stats?.total_quantity || 0
                        ).toLocaleString()}{" "}
                        bricks
                      </TableCell>
                      <TableCell align="right">
                        {(
                          (reportsData.production.stats?.total_quantity || 0) -
                          (reportsData.sales.stats?.total_quantity || 0)
                        ).toLocaleString()}{" "}
                        bricks
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={
                            (reportsData.production.stats?.total_quantity ||
                              0) >=
                            (reportsData.sales.stats?.total_quantity || 0)
                              ? "Surplus"
                              : "Deficit"
                          }
                          color={
                            (reportsData.production.stats?.total_quantity ||
                              0) >=
                            (reportsData.sales.stats?.total_quantity || 0)
                              ? "success"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Daily</TableCell>
                      <TableCell align="right">
                        {parseFloat(
                          reportsData.production.stats
                            ?.average_daily_production || 0
                        ).toLocaleString()}{" "}
                        bricks/day
                      </TableCell>
                      <TableCell align="right">
                        {reportsData.sales.trends &&
                        reportsData.sales.trends.length > 0
                          ? Math.round(
                              reportsData.sales.trends.reduce(
                                (sum, day) => sum + (day.total_quantity || 0),
                                0
                              ) / reportsData.sales.trends.length
                            ).toLocaleString()
                          : 0}{" "}
                        bricks/day
                      </TableCell>
                      <TableCell align="right">
                        {(
                          parseFloat(
                            reportsData.production.stats
                              ?.average_daily_production || 0
                          ) -
                          (reportsData.sales.trends &&
                          reportsData.sales.trends.length > 0
                            ? Math.round(
                                reportsData.sales.trends.reduce(
                                  (sum, day) => sum + (day.total_quantity || 0),
                                  0
                                ) / reportsData.sales.trends.length
                              )
                            : 0)
                        ).toLocaleString()}{" "}
                        bricks/day
                      </TableCell>
                      <TableCell align="right">
                        <Chip label="Normal" color="info" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Revenue Generated</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">
                        {formatCurrency(
                          reportsData.sales.stats?.total_revenue || 0
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(
                          reportsData.sales.stats?.total_revenue || 0
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Chip label="Revenue" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
}

export default Reports;
