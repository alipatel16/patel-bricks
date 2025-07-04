import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DEFAULT_BANK_DETAILS, VALIDATION_RULES } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';
import toast from 'react-hot-toast';

const BankDetailsSettings = () => {
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK_DETAILS);
  const [originalBankDetails, setOriginalBankDetails] = useState(DEFAULT_BANK_DETAILS);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadBankDetails();
  }, []);

  const loadBankDetails = async () => {
    setLoading(true);
    try {
      // Try to load bank details from Firebase
      const result = await dbUtils.readData('settings/bank_details');
      if (result.success && result.data) {
        setBankDetails(result.data);
        setOriginalBankDetails(result.data);
      } else {
        // Use default bank details if none found
        setBankDetails(DEFAULT_BANK_DETAILS);
        setOriginalBankDetails(DEFAULT_BANK_DETAILS);
      }
    } catch (error) {
      console.error('Error loading bank details:', error);
      toast.error('Error loading bank details');
      setBankDetails(DEFAULT_BANK_DETAILS);
      setOriginalBankDetails(DEFAULT_BANK_DETAILS);
    } finally {
      setLoading(false);
    }
  };

  const validateBankDetails = () => {
    const errors = {};

    // Bank name validation
    if (!bankDetails.bankName?.trim()) {
      errors.bankName = 'Bank name is required';
    } else if (bankDetails.bankName.trim().length < 2) {
      errors.bankName = 'Bank name must be at least 2 characters';
    }

    // Account number validation
    if (!bankDetails.accountNumber?.trim()) {
      errors.accountNumber = 'Account number is required';
    } else if (!VALIDATION_RULES.ACCOUNT_NUMBER_REGEX.test(bankDetails.accountNumber)) {
      errors.accountNumber = 'Account number must be 9-18 digits';
    }

    // IFSC code validation
    if (!bankDetails.ifscCode?.trim()) {
      errors.ifscCode = 'IFSC code is required';
    } else if (!VALIDATION_RULES.IFSC_REGEX.test(bankDetails.ifscCode.toUpperCase())) {
      errors.ifscCode = 'Invalid IFSC code format (e.g., ABCD0123456)';
    }

    // Branch validation
    if (!bankDetails.branch?.trim()) {
      errors.branch = 'Branch name is required';
    } else if (bankDetails.branch.trim().length < 2) {
      errors.branch = 'Branch name must be at least 2 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateBankDetails()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      // Save bank details to Firebase
      const result = await dbUtils.writeData('settings/bank_details', bankDetails);
      
      if (result.success) {
        setOriginalBankDetails(bankDetails);
        setIsEditing(false);
        toast.success('Bank details saved successfully');
      } else {
        toast.error('Failed to save bank details');
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error('Error saving bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBankDetails(originalBankDetails);
    setValidationErrors({});
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleInputChange = (field, value) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: field === 'ifscCode' ? value.toUpperCase() : value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleRefresh = () => {
    loadBankDetails();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading bank details...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BankIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              Bank Details Settings
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleRefresh} disabled={isEditing}>
              <RefreshIcon />
            </IconButton>
            {!isEditing ? (
              <Button
                variant="outlined"
                onClick={handleEdit}
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={<SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          These bank details will be displayed on all generated invoices. Make sure they are accurate.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Bank Name"
              fullWidth
              required
              value={bankDetails.bankName || ''}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.bankName}
              helperText={validationErrors.bankName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BankIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Branch Name"
              fullWidth
              required
              value={bankDetails.branch || ''}
              onChange={(e) => handleInputChange('branch', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.branch}
              helperText={validationErrors.branch}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Account Number"
              fullWidth
              required
              value={bankDetails.accountNumber || ''}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.accountNumber}
              helperText={validationErrors.accountNumber || 'Enter 9-18 digit account number'}
              inputProps={{
                pattern: '[0-9]*',
                inputMode: 'numeric'
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="IFSC Code"
              fullWidth
              required
              value={bankDetails.ifscCode || ''}
              onChange={(e) => handleInputChange('ifscCode', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.ifscCode}
              helperText={validationErrors.ifscCode || 'Format: ABCD0123456 (11 characters)'}
              inputProps={{
                style: { textTransform: 'uppercase' }
              }}
            />
          </Grid>
        </Grid>

        {/* Preview Section */}
        <Divider sx={{ my: 4 }} />
        
        <Typography variant="h6" gutterBottom>
          Invoice Preview
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          This is how the bank details will appear on invoices:
        </Alert>

        <Box sx={{ 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 1, 
          p: 2, 
          bgcolor: 'grey.50' 
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Bank Details
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {bankDetails.bankName || 'Bank Name'}<br/>
            {bankDetails.accountNumber || 'Account Number'}<br/>
            {bankDetails.ifscCode || 'IFSC Code'}<br/>
            {bankDetails.branch || 'Branch Name'}
          </Typography>
        </Box>

        {isEditing && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Remember to save your changes before leaving this page.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default BankDetailsSettings;