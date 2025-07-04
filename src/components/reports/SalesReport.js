import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MoneyIcon,
  Assessment as AssessmentIcon,
  ShoppingCart as SalesIcon,
} from '@mui/icons-material';
import { reportsService } from '../../services/reportsService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const SalesReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [error, setError] = useState(null);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await reportsService.generateSalesReport(period);
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
        toast.error('Failed to load sales report');
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
      setError(error.message);
      toast.error('An error occurred while loading the report');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = () => {
    if (!reportData) return;

    const headers = ['Metric', 'Value'];
    const data = [
      ['Report Period', reportData.period],
      ['Total Sales', `${formatNumber(reportData.stats.total_quantity)} bricks`],
      ['Total Revenue', formatCurrency(reportData.stats.total_revenue)],
      ['Total Transactions', formatNumber(reportData.stats.total_transactions)],
      ['Average Sale Size', `${formatNumber(reportData.stats.average_sale_size)} bricks`],
      ['Average Price per Brick', formatCurrency(reportData.stats.average_price_per_brick)],
      ['Total Profit', formatCurrency(reportData.stats.total_profit)],
      ['Profit Margin', `${reportData.stats.profit_margin}%`],
      ['Top Customer', reportData.top_customers[0]?.customer_name || 'N/A'],
      ['Cash Sales', formatCurrency(reportData.payment_breakdown.cash)],
      ['Credit Sales', formatCurrency(reportData.payment_breakdown.credit)],
      ['Digital Sales', formatCurrency(reportData.payment_breakdown.digital)],
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Generating sales report..." />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Failed to Load Report</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button variant="outlined" onClick={loadReportData} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!reportData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No sales data available for the selected period.
      </Alert>
    );
  }

  // Prepare chart data
  const dailySalesData = reportData.data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    quantity: item.quantity,
    revenue: item.total_amount,
    profit: item.profit,
    transactions: item.transactions || 1,
  }));

  const paymentMethodData = Object.entries(reportData.payment_breakdown).map(([method, amount]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: amount,
    percentage: ((amount / reportData.stats.total_revenue) * 100).toFixed(1),
  }));

  const revenueTrend = reportData.data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.total_amount,
    profit: item.profit,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SalesIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Sales Report
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive analysis of sales performance and revenue
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportReport}
            size="small"
          >
            Export
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printReport}
            size="small"
            className="no-print"
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight={700}>
                {formatCurrency(reportData.stats.total_revenue)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight={700}>
                {formatNumber(reportData.stats.total_quantity)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Bricks Sold
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight={700}>
                {formatNumber(reportData.stats.total_transactions)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight={700}>
                {formatCurrency(reportData.stats.total_profit)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Profit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Daily Sales Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quantity" fill="#2196f3" name="Bricks Sold" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#4caf50" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Method Distribution */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Payment Methods
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue & Profit Trend */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Revenue & Profit Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="#2196f3" 
                    fill="#2196f3"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stackId="2"
                    stroke="#4caf50" 
                    fill="#4caf50"
                    fillOpacity={0.6}
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Statistics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Sales Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Revenue</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(reportData.stats.total_revenue)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Bricks Sold</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.total_quantity)} units
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Transactions</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.total_transactions)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Sale Size</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.average_sale_size)} bricks
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Price per Brick</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.stats.average_price_per_brick)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Profit</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatCurrency(reportData.stats.total_profit)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Profit Margin</TableCell>
                      <TableCell align="right">
                        {reportData.stats.profit_margin}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Top Customers
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Bricks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.top_customers.slice(0, 5).map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {customer.customer_name || 'Walk-in Customer'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(customer.total_revenue)}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(customer.total_quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.top_customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No customer data available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Breakdown */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Payment Method Breakdown
              </Typography>
              <Grid container spacing={2}>
                {paymentMethodData.map((payment, index) => (
                  <Grid item xs={12} sm={4} key={payment.name}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="h5" fontWeight={600}>
                        {formatCurrency(payment.value)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {payment.name} ({payment.percentage}%)
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" align="center">
          Sales Report generated on {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })} • Period: {reportData.period}
        </Typography>
      </Box>
    </Box>
  );
};

export default SalesReport;