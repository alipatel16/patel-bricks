import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Button,
  TextField,
  InputAdornment,
  TablePagination,
  Alert,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

// Import services
import { productionService } from '../../services/productionService';

// Import contexts
import { useApp } from '../../context/AppContext';

// Import constants
import { PRODUCTION_SHIFTS, QUALITY_GRADES } from '../../utils/constants';

function ProductionList({ onEdit = null, onAdd = null, showActions = true }) {
  const { actions: appActions } = useApp();

  // State management
  const [productionData, setProductionData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsData, setStatsData] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load production data
  useEffect(() => {
    loadProductionData();
    loadProductionStats();
  }, []);

  // Filter data when search changes
  useEffect(() => {
    filterData();
  }, [productionData, searchTerm]);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      const result = await productionService.getProductionHistory(100);
      
      if (result.success) {
        setProductionData(result.data);
      } else {
        appActions.showNotification('Failed to load production data', 'error');
      }
    } catch (error) {
      
      appActions.showNotification('Error loading production data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProductionStats = async () => {
    try {
      const result = await productionService.getProductionStats('month');
      if (result.success) {
        setStatsData(result.data);
      }
    } catch (error) {
      
    }
  };

  const filterData = () => {
    if (!searchTerm) {
      setFilteredData(productionData);
      return;
    }

    const filtered = productionData.filter(production => {
      const searchLower = searchTerm.toLowerCase();
      return (
        production.date.includes(searchTerm) ||
        production.shift?.toLowerCase().includes(searchLower) ||
        production.quality?.toLowerCase().includes(searchLower) ||
        production.notes?.toLowerCase().includes(searchLower) ||
        production.quantity.toString().includes(searchTerm) ||
        production.cement_used.toString().includes(searchTerm)
      );
    });

    setFilteredData(filtered);
    setPage(0);
  };

  const handleDelete = async (date) => {
    if (window.confirm('Are you sure you want to delete this production record?')) {
      try {
        const result = await productionService.deleteProduction(date);
        
        if (result.success) {
          appActions.showNotification('Production record deleted', 'success');
          loadProductionData();
        } else {
          appActions.showNotification('Failed to delete production record', 'error');
        }
      } catch (error) {
        
        appActions.showNotification('Error deleting production record', 'error');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getShiftLabel = (shift) => {
    return PRODUCTION_SHIFTS[shift]?.label || shift;
  };

  const getQualityLabel = (quality) => {
    return QUALITY_GRADES[quality]?.label || `Grade ${quality}`;
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'A': return 'success';
      case 'B': return 'primary';
      case 'C': return 'warning';
      default: return 'default';
    }
  };

  // Paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Summary Stats */}
      {statsData && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {statsData.total_quantity.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Production
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  {statsData.average_efficiency}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg. Efficiency
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                  {statsData.total_cement_used}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Cement Used (bags)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                  {statsData.production_days}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Production Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Production History
            </Typography>
            {showActions && onAdd && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAdd}
              >
                Add Production
              </Button>
            )}
          </Box>

          {/* Search */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search by date, shift, quality, notes, or quantities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchTerm('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 500 }}
            />
          </Box>

          {/* Results Summary */}
          {searchTerm && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing {filteredData.length} of {productionData.length} production records
            </Alert>
          )}

          {/* Production Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Cement Used</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell align="right">Efficiency</TableCell>
                  <TableCell>Notes</TableCell>
                  {showActions && <TableCell align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={showActions ? 8 : 7} align="center" sx={{ py: 4 }}>
                      Loading production history...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showActions ? 8 : 7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        {searchTerm 
                          ? 'No production records found matching your search'
                          : 'No production history available'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((production) => (
                    <TableRow key={production.date} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDate(production.date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {production.quantity.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          bricks
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {production.cement_used} bags
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getShiftLabel(production.shift)} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getQualityLabel(production.quality)} 
                          size="small" 
                          color={getQualityColor(production.quality)}
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <TrendingUpIcon 
                            fontSize="small" 
                            color={production.efficiency > 15 ? 'success' : 'warning'} 
                          />
                          <Typography 
                            variant="body2" 
                            color={production.efficiency > 15 ? 'success.main' : 'warning.main'}
                            sx={{ fontWeight: 600 }}
                          >
                            {production.efficiency}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 150, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={production.notes}
                        >
                          {production.notes || '-'}
                        </Typography>
                      </TableCell>
                      {showActions && (
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton size="small" color="info">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {onEdit && (
                              <Tooltip title="Edit Production">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => onEdit(production)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete Production">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDelete(production.date)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default ProductionList;