// components/sales/PaymentEntry.js - Payment Entry Component
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { PAYMENT_METHODS, DB_PATHS } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';

const PaymentEntry = ({ open, onClose, customer, onPaymentSaved }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form management
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      creditAmount: '',
      modeOfPayment: 'cash',
      notes: '',
    },
  });

  // Watch form values for real-time updates
  const watchedValues = watch();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        date: new Date().toISOString().split('T')[0],
        creditAmount: '',
        modeOfPayment: 'cash',
        notes: '',
      });
    }
  }, [open, reset]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      // Validate credit amount
      const creditAmount = parseFloat(data.creditAmount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        toast.error('Please enter a valid credit amount');
        return;
      }

      // Prepare payment entry data
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentDate = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();

      const paymentEntry = {
        id: paymentId,
        customerId: `${customer.name}_${customer.phone}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: data.date,
        creditAmount: creditAmount,
        modeOfPayment: data.modeOfPayment,
        notes: data.notes,
        type: 'payment',
        status: 'completed',
        createdDate: currentDate,
        timestamp: timestamp,
        createdBy: 'system',
      };

      // Save to Firebase database
      const paymentsPath = `${DB_PATHS.SALES}/payments/${paymentId}`;
      const result = await dbUtils.writeData(paymentsPath, paymentEntry);

      if (result.success) {
        // Also update customer's payment summary
        try {
          const customerPaymentsPath = `${DB_PATHS.CUSTOMERS}/${customer.phone}/payments/${paymentId}`;
          await dbUtils.writeData(customerPaymentsPath, {
            paymentId: paymentId,
            amount: creditAmount,
            date: data.date,
            method: data.modeOfPayment,
            timestamp: timestamp,
          });
        } catch (customerError) {
          
          // Continue anyway as main payment was saved
        }

        // Call the callback if provided
        if (onPaymentSaved) {
          await onPaymentSaved(paymentEntry);
        }

        toast.success(`Payment of ${formatCurrency(creditAmount)} recorded successfully`);
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to save payment');
      }

    } catch (error) {
      
      toast.error('Failed to save payment entry');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isLoading) {
      reset();
      onClose();
    }
  };

  if (!customer) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Payment Entry
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Record payment for {customer.name} - {customer.phone}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Customer Info Display */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Customer:</strong> {customer.name}<br />
                <strong>Phone:</strong> {customer.phone}<br />
                <strong>Total Outstanding:</strong> {formatCurrency(customer.totalAmount || 0)}
              </Typography>
            </Alert>

            {/* Date Field */}
            <Controller
              name="date"
              control={control}
              rules={{ required: 'Date is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Payment Date"
                  type="date"
                  fullWidth
                  required
                  error={!!errors.date}
                  helperText={errors.date?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}
            />

            {/* Credit Amount Field */}
            <Controller
              name="creditAmount"
              control={control}
              rules={{ 
                required: 'Credit amount is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Credit Amount"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ 
                    min: 0, 
                    step: 0.01 
                  }}
                  error={!!errors.creditAmount}
                  helperText={errors.creditAmount?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Mode of Payment Field */}
            <Controller
              name="modeOfPayment"
              control={control}
              rules={{ required: 'Payment mode is required' }}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.modeOfPayment}>
                  <InputLabel>Mode of Payment</InputLabel>
                  <Select
                    {...field}
                    label="Mode of Payment"
                    startAdornment={
                      <InputAdornment position="start">
                        <PaymentIcon />
                      </InputAdornment>
                    }
                  >
                    {Object.values(PAYMENT_METHODS).map((method) => (
                      <MenuItem key={method.id} value={method.id}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.modeOfPayment && (
                    <Typography variant="caption" color="error">
                      {errors.modeOfPayment.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            {/* Notes Field */}
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Additional notes about this payment..."
                />
              )}
            />

            {/* Payment Summary */}
            {watchedValues.creditAmount && (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Payment Summary:</strong><br />
                  Amount: {formatCurrency(parseFloat(watchedValues.creditAmount) || 0)}<br />
                  Method: {Object.values(PAYMENT_METHODS).find(m => m.id === watchedValues.modeOfPayment)?.label}<br />
                  Date: {watchedValues.date}
                </Typography>
              </Alert>
            )}

          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={isLoading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentEntry;