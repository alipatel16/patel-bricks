import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Factory as FactoryIcon,
  Save as SaveIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Import contexts and services
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { productionService } from '../../services/productionService';

// Import utilities
import { calculateCementNeeded, validateProductionCapacity } from '../../utils/calculations';
import { PRODUCTION_SHIFTS } from '../../utils/constants'; // Removed QUALITY_GRADES import

function ProductionForm({ onSuccess = null, onCancel = null, initialData = null }) {
  const { actions: appActions, settings } = useApp();
  const { cement, actions: inventoryActions } = useInventory();

  const [calculatedCement, setCalculatedCement] = useState(0);
  const [capacityCheck, setCapacityCheck] = useState(null);

  // Form management - UPDATED: Removed quality, fixed default shift value
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      quantity: initialData?.quantity || '',
      cementUsed: initialData?.cement_used || '',
      shift: initialData?.shift || 'morning', // Fixed: lowercase to match constants
      // quality: initialData?.quality || 'B', // REMOVED: No longer needed
      notes: initialData?.notes || '',
      overrideCement: false,
    }
  });

  const watchQuantity = watch('quantity');
  const watchOverrideCement = watch('overrideCement');
  const watchCementUsed = watch('cementUsed');

  // Calculate cement needed automatically
  useEffect(() => {
    if (watchQuantity && !watchOverrideCement) {
      const ratio = settings.cement_per_brick_ratio || 0.05;
      const needed = calculateCementNeeded(parseInt(watchQuantity), ratio);
      setCalculatedCement(needed);
      setValue('cementUsed', needed);
      
      // Check production capacity
      const capacity = validateProductionCapacity(
        parseInt(watchQuantity),
        cement.total_bags,
        ratio
      );
      setCapacityCheck(capacity);
    }
  }, [watchQuantity, watchOverrideCement, settings.cement_per_brick_ratio, cement.total_bags, setValue]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      const result = await productionService.addProduction({
        quantity: parseInt(data.quantity),
        cementUsed: parseFloat(data.cementUsed),
        shift: data.shift,
        // quality: data.quality, // REMOVED: No longer needed
        notes: data.notes,
        overrideCementCalculation: data.overrideCement,
      });

      if (result.success) {
        appActions.showSnackbar('Production recorded successfully!', 'success');
        reset();
        if (onSuccess) onSuccess(result.data);
      } else {
        appActions.showSnackbar(result.error || 'Failed to record production', 'error');
      }
    } catch (error) {
      console.error('Error submitting production:', error);
      appActions.showSnackbar('Failed to record production', 'error');
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <FactoryIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Record Production
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' },
                  max: { value: 100000, message: 'Quantity seems too large' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Bricks Produced"
                    type="number"
                    fullWidth
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">bricks</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="cementUsed"
                control={control}
                rules={{
                  required: 'Cement used is required',
                  min: { value: 0, message: 'Cement used cannot be negative' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Cement Used"
                    type="number"
                    step="0.1"
                    fullWidth
                    error={!!errors.cementUsed}
                    helperText={errors.cementUsed?.message || `Available: ${cement.total_bags} bags`}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">bags</InputAdornment>,
                      startAdornment: watchOverrideCement ? null : (
                        <InputAdornment position="start">
                          <Chip 
                            label="Auto" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </InputAdornment>
                      ),
                    }}
                    disabled={!watchOverrideCement}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="shift"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Production Shift</InputLabel>
                    <Select {...field} label="Production Shift">
                      {Object.entries(PRODUCTION_SHIFTS).map(([key, shift]) => (
                        <MenuItem key={key} value={key}>
                          {shift.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* REMOVED: Quality Grade Selection - No longer needed */}

            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes (optional)"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Any additional information about this production run..."
                  />
                )}
              />
            </Grid>

            {/* Cement Calculation Display */}
            {watchQuantity && !watchOverrideCement && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalculateIcon />
                  <Box>
                    <Typography variant="body2">
                      <strong>Cement Calculation:</strong> {watchQuantity} bricks × {settings.cement_per_brick_ratio || 0.05} = {calculatedCement} bags
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Based on cement-to-brick ratio: {settings.cement_per_brick_ratio || 0.05} bags per brick
                    </Typography>
                  </Box>
                </Alert>
              </Grid>
            )}

            {/* Capacity Check */}
            {capacityCheck && (
              <Grid item xs={12}>
                <Alert 
                  severity={capacityCheck.isValid ? 'success' : 'warning'}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Box>
                    <Typography variant="body2">
                      <strong>Capacity Check:</strong> {capacityCheck.message}
                    </Typography>
                    {!capacityCheck.isValid && (
                      <Typography variant="caption" color="textSecondary">
                        Available cement: {capacityCheck.availableCement} bags | Required: {capacityCheck.requiredCement} bags
                      </Typography>
                    )}
                  </Box>
                </Alert>
              </Grid>
            )}
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isSubmitting || (capacityCheck && !capacityCheck.isValid)}
              sx={{ minWidth: 150 }}
            >
              {isSubmitting ? 'Recording...' : 'Record Production'}
            </Button>
            
            {onCancel && (
              <Button onClick={onCancel} variant="outlined">
                Cancel
              </Button>
            )}
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProductionForm;