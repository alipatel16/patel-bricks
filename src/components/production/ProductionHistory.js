import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useProduction } from '../../hooks/useProduction';
import LoadingSpinner from '../common/LoadingSpinner';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ProductionHistory = () => {
  const { production, loadProductionHistory } = useProduction();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [qualityFilter, setQualityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load production history on component mount
  useEffect(() => {
    loadProductionHistory();
  }, [loadProductionHistory]);

  // Filter and sort production data
  const getFilteredData = () => {
    let filtered = [...(production.history || [])];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.operator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= today;
        });
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= monthAgo;
        });
        break;
      case 'custom':
        if (startDate && endDate) {
          filtered = filtered.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        break;
    }

    // Quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(item => item.quality_grade === qualityFilter);
    }

    // Sort data
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'efficiency':
          aVal = a.efficiency;
          bVal = b.efficiency;
          break;
        case 'cement_used':
          aVal = a.cement_used;
          bVal = b.cement_used;
          break;
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  };

  const filteredData = getFilteredData();
  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A':
        return 'success';
      case 'B':
        return 'warning';
      case 'C':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEfficiencyIcon = (efficiency) => {
    if (efficiency >= 85) return <TrendingUpIcon color="success" />;
    if (efficiency >= 70) return <RemoveIcon color="warning" />;
    return <TrendingDownIcon color="error" />;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Quantity', 'Quality Grade', 'Cement Used', 'Efficiency', 'Operator', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        formatDate(row.date),
        row.quantity,
        row.quality_grade,
        row.cement_used,
        `${row.efficiency}%`,
        row.operator || '',
        `"${row.notes || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (production.loading) {
    return <LoadingSpinner message="Loading production history..." />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Card elevation={2}>
          <CardContent>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" component="h2" fontWeight={600}>
                  Production History
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Track and analyze past production records
                </Typography>
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={filteredData.length === 0}
              >
                Export CSV
              </Button>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={dateFilter}
                    label="Date Range"
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">Last 7 Days</MenuItem>
                    <MenuItem value="month">Last 30 Days</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {dateFilter === 'custom' && (
                <>
                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={setEndDate}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Quality Grade</InputLabel>
                  <Select
                    value={qualityFilter}
                    label="Quality Grade"
                    onChange={(e) => setQualityFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Grades</MenuItem>
                    <MenuItem value="A">Grade A</MenuItem>
                    <MenuItem value="B">Grade B</MenuItem>
                    <MenuItem value="C">Grade C</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1}>
                <FormControl fullWidth>
                  <InputLabel>Sort</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="quantity">Quantity</MenuItem>
                    <MenuItem value="efficiency">Efficiency</MenuItem>
                    <MenuItem value="cement_used">Cement Used</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Results Summary */}
            {filteredData.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Found {formatNumber(filteredData.length)} production records
                {filteredData.length !== (production.history?.length || 0) && 
                  ` (filtered from ${formatNumber(production.history?.length || 0)} total)`
                }
              </Alert>
            )}

            {/* Production Table */}
            {filteredData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="textSecondary">
                  No production records found
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {searchTerm || dateFilter !== 'all' || qualityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start recording production to see history here'
                  }
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="center">Quality</TableCell>
                        <TableCell align="right">Cement Used</TableCell>
                        <TableCell align="center">Efficiency</TableCell>
                        <TableCell>Operator</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((record) => (
                        <TableRow key={record.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {formatDate(record.date)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(record.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {formatNumber(record.quantity)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              bricks
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`Grade ${record.quality_grade}`}
                              color={getQualityColor(record.quality_grade)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatNumber(record.cement_used)} bags
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              {getEfficiencyIcon(record.efficiency)}
                              <Typography variant="body2">
                                {record.efficiency}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {record.operator || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: 200, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {record.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default ProductionHistory;