import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
} from 'recharts';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { reportsService } from '../../services/reportsService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const InventoryReport = () => {
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
      const result = await reportsService.generateInventoryReport();
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
        toast.error('Failed to load inventory report');
      }
    } catch (error) {
      
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
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const exportReport = () => {
    if (!reportData) return;

    const headers = ['Metric', 'Value'];
    const data = [
      ['Report Date', new Date().toLocaleDateString()],
      ['Total Brick Stock', `${formatNumber(reportData.current_stock.bricks.total_stock)} bricks`],
      ['Brick Inventory Value', formatCurrency(reportData.current_stock.bricks.value)],
      ['Total Cement Stock', `${formatNumber(reportData.current_stock.cement.total_bags)} bags`],
      ['Cement Inventory Value', formatCurrency(reportData.current_stock.cement.value)],
      ['Total Inventory Value', formatCurrency(reportData.total_value)],
      ['Inventory Turnover Ratio', reportData.turnover_analysis.turnover_ratio.toFixed(2)],
      ['Days of Stock Remaining', `${reportData.turnover_analysis.days_of_stock} days`],
      ['Stock Status', reportData.stock_status.overall_status],
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Generating inventory report..." />;
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
        No inventory data available.
      </Alert>
    );
  }

  // Prepare chart data
  const inventoryComposition = [
    {
      name: 'Bricks',
      value: reportData.current_stock.bricks.value,
      quantity: reportData.current_stock.bricks.total_stock,
      unit: 'bricks',
    },
    {
      name: 'Cement',
      value: reportData.current_stock.cement.value,
      quantity: reportData.current_stock.cement.total_bags,
      unit: 'bags',
    },
  ];

  const movementData = reportData.recent_movements?.map(movement => ({
    date: new Date(movement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bricks_in: movement.type === 'production' ? movement.quantity : 0,
    bricks_out: movement.type === 'sale' ? movement.quantity : 0,
    cement_in: movement.type === 'cement_purchase' ? movement.quantity : 0,
    cement_out: movement.type === 'production' ? movement.cement_used : 0,
  })) || [];

  const getStockStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'low':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InventoryIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Inventory Report
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Current stock levels, movements, and inventory analysis
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
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

      {/* Current Stock Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight={700}>
                {formatNumber(reportData.current_stock.bricks.total_stock)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Bricks in Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight={700}>
                {formatNumber(reportData.current_stock.cement.total_bags)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cement Bags
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight={700}>
                {formatCurrency(reportData.total_value)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Inventory Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Chip
                label={reportData.stock_status.overall_status}
                color={getStockStatusColor(reportData.stock_status.overall_status)}
                size="large"
                sx={{ fontSize: '1rem', py: 2 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Stock Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock Alerts */}
      {(reportData.stock_status.low_stock_items?.length > 0) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Low Stock Alert
          </Typography>
          <Typography variant="body2">
            The following items are running low: {reportData.stock_status.low_stock_items.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Inventory Composition */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Inventory Value Composition
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryComposition}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {inventoryComposition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Stock Levels */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Current Stock Levels
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryComposition} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${formatNumber(value)} ${name === 'quantity' ? inventoryComposition.find(item => item.name === name)?.unit || '' : ''}`,
                      name === 'quantity' ? 'Quantity' : 'Value'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="quantity" fill="#2196f3" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Movements */}
        {movementData.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Recent Inventory Movements
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={movementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="bricks_in" 
                      stroke="#4caf50" 
                      name="Bricks In"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bricks_out" 
                      stroke="#f44336" 
                      name="Bricks Out"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Detailed Analysis */}
      <Grid container spacing={3}>
        {/* Stock Details */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Stock Details
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Bricks</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.current_stock.bricks.total_stock)} units
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.current_stock.bricks.value)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={reportData.stock_status.bricks === 'healthy' ? <CheckCircleIcon /> : <WarningIcon />}
                          label={reportData.stock_status.bricks}
                          color={getStockStatusColor(reportData.stock_status.bricks)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cement</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.current_stock.cement.total_bags)} bags
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.current_stock.cement.value)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={reportData.stock_status.cement === 'healthy' ? <CheckCircleIcon /> : <WarningIcon />}
                          label={reportData.stock_status.cement}
                          color={getStockStatusColor(reportData.stock_status.cement)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Turnover Analysis */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Turnover Analysis
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUpIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Inventory Turnover Ratio"
                    secondary={`${reportData.turnover_analysis.turnover_ratio.toFixed(2)} times per period`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Days of Stock Remaining"
                    secondary={`${reportData.turnover_analysis.days_of_stock} days at current sales rate`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InventoryIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Reorder Point"
                    secondary={`${formatNumber(reportData.turnover_analysis.reorder_point)} bricks recommended`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        {reportData.recent_transactions?.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Recent Inventory Transactions
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.recent_transactions.slice(0, 10).map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.type.replace('_', ' ').toUpperCase()}
                              size="small"
                              color={
                                transaction.type.includes('purchase') || transaction.type.includes('production')
                                  ? 'success'
                                  : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {transaction.type.includes('cement')
                              ? `${formatNumber(transaction.quantity)} bags`
                              : `${formatNumber(transaction.quantity)} bricks`
                            }
                          </TableCell>
                          <TableCell>
                            {transaction.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Report Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" align="center">
          Inventory Report generated on {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Typography>
      </Box>
    </Box>
  );
};

export default InventoryReport;