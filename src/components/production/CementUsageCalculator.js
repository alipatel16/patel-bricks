import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Box,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Import contexts and utilities
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { 
  calculateCementNeeded, 
  calculateMaxBricksFromCement,
  validateProductionCapacity,
  calculateProductionEfficiency 
} from '../../utils/calculations';

function CementUsageCalculator() {
  const { settings } = useApp();
  const { cement } = useInventory();

  // State for calculations
  const [inputs, setInputs] = useState({
    brickQuantity: '',
    cementRatio: settings.cement_per_brick_ratio || 0.05,
    customRatio: false,
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);

  // Calculate results when inputs change
  useEffect(() => {
    if (inputs.brickQuantity && inputs.cementRatio) {
      calculateResults();
    }
  }, [inputs, cement.total_bags]);

  // Generate scenarios
  useEffect(() => {
    generateScenarios();
  }, [cement.total_bags, inputs.cementRatio]);

  const calculateResults = () => {
    const bricks = parseInt(inputs.brickQuantity) || 0;
    const ratio = parseFloat(inputs.cementRatio) || 0.05;
    
    if (bricks <= 0 || ratio <= 0) {
      setResults(null);
      return;
    }

    const cementNeeded = calculateCementNeeded(bricks, ratio);
    const maxPossible = calculateMaxBricksFromCement(cement.total_bags, ratio);
    const capacity = validateProductionCapacity(bricks, cement.total_bags, ratio);
    const efficiency = calculateProductionEfficiency(bricks, cementNeeded);

    // Cost calculations (if available)
    const cementCost = cementNeeded * (cement.cost_per_bag || 25);
    const costPerBrick = cementCost / bricks;

    setResults({
      bricks,
      cementNeeded,
      maxPossible,
      capacity,
      efficiency: parseFloat(efficiency),
      cost: {
        total: cementCost,
        perBrick: costPerBrick,
        perBag: cement.cost_per_bag || 25,
      },
      feasible: capacity.isValid,
      shortage: capacity.shortage,
    });
  };

  const generateScenarios = () => {
    const availableCement = cement.total_bags;
    const ratio = parseFloat(inputs.cementRatio) || 0.05;
    
    if (availableCement <= 0 || ratio <= 0) {
      setScenarios([]);
      return;
    }

    const scenarioData = [
      { percentage: 25, label: '25% of cement' },
      { percentage: 50, label: '50% of cement' },
      { percentage: 75, label: '75% of cement' },
      { percentage: 100, label: 'All cement' },
    ];

    const newScenarios = scenarioData.map(scenario => {
      const cementUsed = (availableCement * scenario.percentage) / 100;
      const bricksProduced = calculateMaxBricksFromCement(cementUsed, ratio);
      const efficiency = calculateProductionEfficiency(bricksProduced, cementUsed);
      const cost = cementUsed * (cement.cost_per_bag || 25);

      return {
        ...scenario,
        cementUsed: cementUsed.toFixed(1),
        bricksProduced: Math.floor(bricksProduced),
        efficiency: parseFloat(efficiency),
        cost: cost.toFixed(2),
      };
    });

    setScenarios(newScenarios);
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Calculator Input */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Cement Usage Calculator
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Brick Quantity"
                    type="number"
                    value={inputs.brickQuantity}
                    onChange={(e) => handleInputChange('brickQuantity', e.target.value)}
                    placeholder="Enter number of bricks to produce"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">bricks</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cement per Brick Ratio"
                    type="number"
                    step="0.001"
                    value={inputs.cementRatio}
                    onChange={(e) => handleInputChange('cementRatio', e.target.value)}
                    helperText={`Default: ${settings.cement_per_brick_ratio || 0.05} bags per brick`}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">bags/brick</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Available Cement:</strong> {cement.total_bags} bags
                    </Typography>
                    <Typography variant="caption">
                      Cost per bag: ${cement.cost_per_bag || 25}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Calculation Results
              </Typography>

              {results ? (
                <Box>
                  {/* Feasibility Check */}
                  <Alert 
                    severity={results.feasible ? 'success' : 'error'} 
                    sx={{ mb: 2 }}
                    icon={results.feasible ? <CheckCircleIcon /> : <WarningIcon />}
                  >
                    <Typography variant="body2">
                      {results.feasible 
                        ? `✓ Production is feasible with available cement`
                        : `✗ Insufficient cement! Short by ${results.shortage} bags`
                      }
                    </Typography>
                  </Alert>

                  {/* Results Grid */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary.contrastText">
                          {formatNumber(results.cementNeeded)}
                        </Typography>
                        <Typography variant="caption" color="primary.contrastText">
                          Cement Needed (bags)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                        <Typography variant="h6" color="success.contrastText">
                          {results.efficiency}%
                        </Typography>
                        <Typography variant="caption" color="success.contrastText">
                          Efficiency
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="h6" color="warning.contrastText">
                          ${results.cost.total.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="warning.contrastText">
                          Total Cement Cost
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                        <Typography variant="h6" color="info.contrastText">
                          ${results.cost.perBrick.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="info.contrastText">
                          Cost per Brick
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  {/* Alternative Production */}
                  <Typography variant="subtitle2" gutterBottom>
                    Maximum Production with Available Cement:
                  </Typography>
                  <Chip 
                    label={`${formatNumber(results.maxPossible)} bricks`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              ) : (
                <Alert severity="info" icon={<InfoIcon />}>
                  Enter brick quantity to see cement requirements and cost calculations.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Production Scenarios */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Production Scenarios
              </Typography>

              {scenarios.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell align="right">Cement Used</TableCell>
                        <TableCell align="right">Bricks Produced</TableCell>
                        <TableCell align="right">Efficiency</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scenarios.map((scenario, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip 
                              label={scenario.label} 
                              size="small" 
                              color={scenario.percentage === 100 ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {scenario.cementUsed} bags
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(scenario.bricksProduced)}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Typography 
                                variant="body2" 
                                color={scenario.efficiency > 15 ? 'success.main' : 'warning.main'}
                              >
                                {scenario.efficiency}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            ${scenario.cost}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  Scenarios will appear here based on available cement stock.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Tips */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Usage Tips
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" paragraph>
                    <strong>Optimization:</strong> Aim for 15-20 bricks per bag of cement for optimal efficiency.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Cost Control:</strong> Monitor cement usage to maintain consistent production costs.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" paragraph>
                    <strong>Planning:</strong> Use scenarios to plan production based on available cement stock.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Quality:</strong> Higher cement ratios may improve quality but increase costs.
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CementUsageCalculator;