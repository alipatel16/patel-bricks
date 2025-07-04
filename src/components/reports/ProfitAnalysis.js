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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  AreaChart,
  Area,
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
  ComposedChart,
} from 'recharts';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MonetizationOn as MoneyIcon,
  Assessment as AssessmentIcon,
  ShowChart as ChartIcon,
  AccountBalance as RevenueIcon,
  Receipt as CostIcon,
} from '@mui/icons-material';
import { reportsService } from '../../services/reportsService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProfitAnalysis = () => {
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
      const result = await reportsService.generateFinancialReport(period);
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
        toast.error('Failed to load profit analysis');
      }
    } catch (error) {
      console.error('Error loading profit analysis:', error);
      setError(error.message);
      toast.error('An error occurred while loading the analysis');
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

  const formatPercentage = (num) => {
    return `${parseFloat(num).toFixed(2)}%`;
  };

  const exportAnalysis = () => {
    if (!reportData) return;

    const headers = ['Metric', 'Value'];
    const data = [
      ['Report Period', reportData.period],
      ['Total Revenue', formatCurrency(reportData.revenue.total)],
      ['Total Costs', formatCurrency(reportData.costs.total)],
      ['Gross Profit', formatCurrency(reportData.profit.gross)],
      ['Net Profit', formatCurrency(reportData.profit.net)],
      ['Profit Margin', formatPercentage(reportData.profit.margin)],
      ['Revenue per Brick', formatCurrency(reportData.metrics.revenuePerBrick)],
      ['Cost per Brick', formatCurrency(reportData.metrics.costPerBrick)],
      ['Profit per Brick', formatCurrency(reportData.metrics.profitPerBrick)],
      ['Inventory Value', formatCurrency(reportData.inventory.value)],
      ['Inventory Turnover', reportData.inventory.turnover.toFixed(2)],
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-analysis-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printAnalysis = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Generating profit analysis..." />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Failed to Load Analysis</Typography>
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
        No financial data available for the selected period.
      </Alert>
    );
  }

  // Prepare chart data
  const profitBreakdown = [
    {
      name: 'Revenue',
      value: reportData.revenue.total,
      color: '#4caf50',
    },
    {
      name: 'Costs',
      value: reportData.costs.total,
      color: '#f44336',
    },
    {
      name: 'Net Profit',
      value: reportData.profit.net,
      color: '#2196f3',
    },
  ];

  const costBreakdown = [
    {
      name: 'Cement',
      value: reportData.costs.cement,
      percentage: ((reportData.costs.cement / reportData.costs.total) * 100).toFixed(1),
    },
    {
      name: 'Other Costs',
      value: reportData.costs.total - reportData.costs.cement,
      percentage: (((reportData.costs.total - reportData.costs.cement) / reportData.costs.total) * 100).toFixed(1),
    },
  ];

  const financialMetrics = [
    {
      metric: 'Revenue per Brick',
      value: reportData.metrics.revenuePerBrick,
      unit: '$',
    },
    {
      metric: 'Cost per Brick',
      value: reportData.metrics.costPerBrick,
      unit: '$',
    },
    {
      metric: 'Profit per Brick',
      value: reportData.metrics.profitPerBrick,
      unit: '$',
    },
  ];

  const getProfitColor = (profit) => {
    if (profit > 0) return 'success';
    if (profit < 0) return 'error';
    return 'warning';
  };

  const getProfitIcon = (profit) => {
    if (profit > 0) return <TrendingUpIcon />;
    if (profit < 0) return <TrendingDownIcon />;
    return <MoneyIcon />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ChartIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Profit Analysis
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive financial performance and profitability analysis
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
            onClick={exportAnalysis}
            size="small"
          >
            Export
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printAnalysis}
            size="small"
            className="no-print"
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Key Financial Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <RevenueIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h4" color="primary" fontWeight={700}>
                  {formatCurrency(reportData.revenue.total)}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <CostIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h4" color="error" fontWeight={700}>
                  {formatCurrency(reportData.costs.total)}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Total Costs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                {getProfitIcon(reportData.profit.net)}
                <Typography 
                  variant="h4" 
                  color={getProfitColor(reportData.profit.net) + '.main'} 
                  fontWeight={700}
                  sx={{ ml: 1 }}
                >
                  {formatCurrency(reportData.profit.net)}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Net Profit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                color={getProfitColor(reportData.profit.margin) + '.main'} 
                fontWeight={700}
              >
                {formatPercentage(reportData.profit.margin)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Profit Margin
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Profit Status Alert */}
      {reportData.profit.net < 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Negative Profit Alert
          </Typography>
          <Typography variant="body2">
            Your business is currently operating at a loss. Consider reviewing costs and pricing strategies.
          </Typography>
        </Alert>
      )}

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Profit Breakdown */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Financial Performance Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={profitBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" fill="#2196f3" name="Amount ($)" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Cost Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Per Unit Metrics */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Per Brick Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={financialMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" fill="#4caf50" name="Amount per Brick ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Analysis */}
      <Grid container spacing={3}>
        {/* Financial Summary */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Financial Summary
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Revenue</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatCurrency(reportData.revenue.total)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Costs</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                        {formatCurrency(reportData.costs.total)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>- Cement Costs</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.costs.cement)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gross Profit</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(reportData.profit.gross)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Net Profit</TableCell>
                      <TableCell 
                        align="right" 
                        sx={{ 
                          fontWeight: 700, 
                          color: getProfitColor(reportData.profit.net) + '.main',
                          fontSize: '1.1rem'
                        }}
                      >
                        {formatCurrency(reportData.profit.net)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Profit Margin</TableCell>
                      <TableCell 
                        align="right" 
                        sx={{ 
                          fontWeight: 700, 
                          color: getProfitColor(reportData.profit.margin) + '.main' 
                        }}
                      >
                        {formatPercentage(reportData.profit.margin)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Performance Indicators */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Key Performance Indicators
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Revenue per Brick"
                    secondary={formatCurrency(reportData.metrics.revenuePerBrick)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CostIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cost per Brick"
                    secondary={formatCurrency(reportData.metrics.costPerBrick)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {getProfitIcon(reportData.metrics.profitPerBrick)}
                  </ListItemIcon>
                  <ListItemText
                    primary="Profit per Brick"
                    secondary={formatCurrency(reportData.metrics.profitPerBrick)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Inventory Turnover"
                    secondary={`${reportData.inventory.turnover.toFixed(2)} times`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <RevenueIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Inventory Value"
                    secondary={formatCurrency(reportData.inventory.value)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Financial Recommendations
              </Typography>
              <Grid container spacing={2}>
                {reportData.profit.margin < 10 && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="warning">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Low Profit Margin
                      </Typography>
                      <Typography variant="body2">
                        Consider increasing brick prices or reducing production costs to improve profitability.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {reportData.inventory.turnover < 2 && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="info">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Low Inventory Turnover
                      </Typography>
                      <Typography variant="body2">
                        Inventory is moving slowly. Consider increasing sales efforts or reducing production.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {reportData.costs.cement / reportData.costs.total > 0.7 && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="info">
                      <Typography variant="subtitle2" fontWeight={600}>
                        High Material Costs
                      </Typography>
                      <Typography variant="body2">
                        Cement costs are high. Consider negotiating better rates with suppliers.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {reportData.profit.net > 0 && reportData.profit.margin > 15 && (
                  <Grid item xs={12} md={6}>
                    <Alert severity="success">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Healthy Profitability
                      </Typography>
                      <Typography variant="body2">
                        Your business is performing well with good profit margins.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" align="center">
          Profit Analysis generated on {new Date().toLocaleDateString('en-US', {
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

export default ProfitAnalysis;