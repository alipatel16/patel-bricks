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
} from 'recharts';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { reportsService } from '../../services/reportsService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProductionReport = () => {
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
      const result = await reportsService.generateProductionReport(period);
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
        toast.error('Failed to load production report');
      }
    } catch (error) {
      console.error('Error loading production report:', error);
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
      ['Total Production', `${formatNumber(reportData.stats.total_quantity)} bricks`],
      ['Production Days', `${reportData.stats.production_days} days`],
      ['Average Daily Production', `${formatNumber(reportData.stats.average_daily_production)} bricks/day`],
      ['Total Cement Used', `${formatNumber(reportData.stats.total_cement_used)} bags`],
      ['Average Efficiency', `${reportData.stats.average_efficiency}%`],
      ['Best Production Day', `${formatNumber(reportData.stats.best_day?.quantity || 0)} bricks`],
      ['Grade A Production', `${formatNumber(reportData.quality_breakdown.A)} bricks`],
      ['Grade B Production', `${formatNumber(reportData.quality_breakdown.B)} bricks`],
      ['Grade C Production', `${formatNumber(reportData.quality_breakdown.C)} bricks`],
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Generating production report..." />;
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
        No production data available for the selected period.
      </Alert>
    );
  }

  // Prepare chart data
  const dailyProductionData = reportData.data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    quantity: item.quantity,
    efficiency: item.efficiency,
    cement_used: item.cement_used,
  }));

  const qualityData = Object.entries(reportData.quality_breakdown).map(([grade, quantity]) => ({
    name: `Grade ${grade}`,
    value: quantity,
    percentage: ((quantity / reportData.stats.total_quantity) * 100).toFixed(1),
  }));

  const efficiencyTrend = reportData.data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    efficiency: item.efficiency,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Production Report
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive analysis of production performance
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
                {formatNumber(reportData.stats.total_quantity)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Bricks Produced
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight={700}>
                {reportData.stats.production_days}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Production Days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight={700}>
                {formatNumber(reportData.stats.average_daily_production)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Avg Daily Production
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight={700}>
                {reportData.stats.average_efficiency}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average Efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily Production Chart */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Daily Production Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyProductionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#2196f3" name="Bricks Produced" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Distribution */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Production by Quality
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Efficiency Trend */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Efficiency Trend
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={efficiencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    name="Efficiency (%)"
                  />
                </LineChart>
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
                Production Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Production</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatNumber(reportData.stats.total_quantity)} bricks
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Production Days</TableCell>
                      <TableCell align="right">
                        {reportData.stats.production_days} days
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Daily Production</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.average_daily_production)} bricks/day
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Cement Used</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.total_cement_used)} bags
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Efficiency</TableCell>
                      <TableCell align="right">
                        {reportData.stats.average_efficiency}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Best Production Day</TableCell>
                      <TableCell align="right">
                        {formatNumber(reportData.stats.best_day?.quantity || 0)} bricks
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
                Quality Distribution
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Grade</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qualityData.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>
                          <Chip 
                            label={item.name} 
                            size="small"
                            color={
                              item.name.includes('A') ? 'success' :
                              item.name.includes('B') ? 'warning' : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(item.value)} bricks
                        </TableCell>
                        <TableCell align="right">
                          {item.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" align="center">
          Report generated on {new Date().toLocaleDateString('en-US', {
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

export default ProductionReport;