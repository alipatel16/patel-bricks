// components/settings/InvoiceConfigSettings.js - Updated with GST Invoice Numbering

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  LocalShipping as TransportIcon,
  Description as DescriptionIcon,
  Percent as TaxIcon,
  Receipt as InvoiceIcon,
} from '@mui/icons-material';
import { HSN_CODES, GST_RATES, INVOICE_SETTINGS } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';
import toast from 'react-hot-toast';

const DEFAULT_INVOICE_CONFIG = {
  ...INVOICE_SETTINGS,
  gstRates: GST_RATES,
  terms: [
    'Goods once sold can not be taken back or exchange',
    'Payment will be made after one month of delivery',
    'All Taxes and Commission will be charged extra',
  ],
  invoiceFormat: {
    showCompanyLogo: true,
    showCustomerDetails: true,
    showBankDetails: true,
    showTerms: true,
    showSignature: true,
  },
  numbering: {
    prefix: 'INV',
    startingNumber: 1,
    autoIncrement: true,
  },
  // NEW: GST Invoice specific numbering
  gstInvoiceNumbering: {
    prefix: 'GST-INV',
    currentNumber: 1,
    autoIncrement: true,
  },
};

const InvoiceConfigSettings = () => {
  const [invoiceConfig, setInvoiceConfig] = useState(DEFAULT_INVOICE_CONFIG);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Dialog states for terms editing
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    loadInvoiceConfig();
  }, []);

  const loadInvoiceConfig = async () => {
    try {
      setLoading(true);
      const result = await dbUtils.readData('settings/invoice_config');
      
      if (result.success && result.data) {
        // Merge with defaults to ensure new fields are present
        const mergedConfig = {
          ...DEFAULT_INVOICE_CONFIG,
          ...result.data,
          // Ensure GST invoice numbering exists
          gstInvoiceNumbering: {
            ...DEFAULT_INVOICE_CONFIG.gstInvoiceNumbering,
            ...result.data.gstInvoiceNumbering,
          },
        };
        setInvoiceConfig(mergedConfig);
      } else {
        // Use defaults if no saved data
        setInvoiceConfig(DEFAULT_INVOICE_CONFIG);
      }
    } catch (error) {
      console.error('Error loading invoice config:', error);
      setInvoiceConfig(DEFAULT_INVOICE_CONFIG);
      toast.error('Failed to load invoice configuration');
    } finally {
      setLoading(false);
    }
  };

  const validateInvoiceConfig = (config) => {
    const errors = {};

    // HSN Code validation
    if (!config.hsnCodeStatic || config.hsnCodeStatic.length < 4) {
      errors.hsnCodeStatic = 'HSN Code must be at least 4 characters';
    }

    // Product description validation
    if (!config.productDescription || config.productDescription.trim().length < 3) {
      errors.productDescription = 'Product description must be at least 3 characters';
    }

    // Transportation mode validation
    if (!config.defaultTransportMode || config.defaultTransportMode.trim().length < 3) {
      errors.defaultTransportMode = 'Transportation mode must be at least 3 characters';
    }

    // Invoice numbering validation
    if (config.numbering.startingNumber < 1) {
      errors.startingNumber = 'Starting number must be at least 1';
    }

    // NEW: GST Invoice numbering validation
    if (!config.gstInvoiceNumbering.prefix || config.gstInvoiceNumbering.prefix.trim().length < 1) {
      errors.gstPrefix = 'GST Invoice prefix is required';
    }

    if (config.gstInvoiceNumbering.currentNumber < 1) {
      errors.gstCurrentNumber = 'GST Invoice number must be at least 1';
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    setInvoiceConfig(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleNestedInputChange = (parent, field, value) => {
    setInvoiceConfig(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));

    // Clear validation error for nested fields
    const errorKey = parent === 'gstInvoiceNumbering' && field === 'prefix' ? 'gstPrefix' :
                    parent === 'gstInvoiceNumbering' && field === 'currentNumber' ? 'gstCurrentNumber' : field;
    
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: null
      }));
    }
  };

  const handleGSTRateChange = (taxType, value) => {
    setInvoiceConfig(prev => ({
      ...prev,
      gstRates: {
        ...prev.gstRates,
        [taxType]: parseFloat(value) || 0
      }
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationErrors({});
    loadInvoiceConfig(); // Reset to saved data
  };

  const handleSave = async () => {
    const errors = validateInvoiceConfig(invoiceConfig);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setSaving(true);
      const result = await dbUtils.writeData('settings/invoice_config', invoiceConfig);
      
      if (result.success) {
        setIsEditing(false);
        setValidationErrors({});
        toast.success('Invoice configuration saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving invoice config:', error);
      toast.error('Failed to save invoice configuration');
    } finally {
      setSaving(false);
    }
  };

  // Terms dialog handlers
  const handleAddTerm = () => {
    if (newTerm.trim()) {
      setInvoiceConfig(prev => ({
        ...prev,
        terms: [...(prev.terms || []), newTerm.trim()]
      }));
      setNewTerm('');
      setTermsDialogOpen(false);
    }
  };

  const handleEditTerm = (index) => {
    setEditingTerm(index);
    setNewTerm(invoiceConfig.terms[index]);
    setTermsDialogOpen(true);
  };

  const handleUpdateTerm = () => {
    if (newTerm.trim() && editingTerm !== null) {
      const updatedTerms = [...invoiceConfig.terms];
      updatedTerms[editingTerm] = newTerm.trim();
      setInvoiceConfig(prev => ({
        ...prev,
        terms: updatedTerms
      }));
      setNewTerm('');
      setEditingTerm(null);
      setTermsDialogOpen(false);
    }
  };

  const handleDeleteTerm = (index) => {
    setInvoiceConfig(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index)
    }));
  };

  const handleCloseTermsDialog = () => {
    setTermsDialogOpen(false);
    setEditingTerm(null);
    setNewTerm('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading invoice configuration...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Invoice Configuration
          </Typography>
          {!isEditing ? (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit Settings
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          )}
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Configure invoice settings, GST rates, and terms & conditions for your business.
        </Alert>

        <Grid container spacing={3}>
          {/* Product Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Product Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isEditing}>
              <InputLabel>HSN Code</InputLabel>
              <Select
                value={invoiceConfig.hsnCodeStatic || ''}
                label="HSN Code"
                onChange={(e) => handleInputChange('hsnCodeStatic', e.target.value)}
                error={!!validationErrors.hsnCodeStatic}
              >
                {Object.entries(HSN_CODES).map(([key, value]) => (
                  <MenuItem key={key} value={value}>
                    {value} - {key.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {validationErrors.hsnCodeStatic && (
              <Typography variant="caption" color="error">
                {validationErrors.hsnCodeStatic}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Product Description"
              fullWidth
              required
              value={invoiceConfig.productDescription || ''}
              onChange={(e) => handleInputChange('productDescription', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.productDescription}
              helperText={validationErrors.productDescription || 'Default product description for invoices'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DescriptionIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Transportation Mode"
              fullWidth
              required
              value={invoiceConfig.defaultTransportMode || ''}
              onChange={(e) => handleInputChange('defaultTransportMode', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.defaultTransportMode}
              helperText={validationErrors.defaultTransportMode || 'Default transportation mode'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TransportIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* GST Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              GST Tax Rates
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="CGST Rate"
              fullWidth
              type="number"
              value={invoiceConfig.gstRates?.CGST || 0}
              onChange={(e) => handleGSTRateChange('CGST', e.target.value)}
              disabled={!isEditing}
              inputProps={{ min: 0, max: 50, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><TaxIcon /></InputAdornment>,
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="SGST Rate"
              fullWidth
              type="number"
              value={invoiceConfig.gstRates?.SGST || 0}
              onChange={(e) => handleGSTRateChange('SGST', e.target.value)}
              disabled={!isEditing}
              inputProps={{ min: 0, max: 50, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><TaxIcon /></InputAdornment>,
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="IGST Rate"
              fullWidth
              type="number"
              value={invoiceConfig.gstRates?.IGST || 0}
              onChange={(e) => handleGSTRateChange('IGST', e.target.value)}
              disabled={!isEditing}
              inputProps={{ min: 0, max: 50, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><TaxIcon /></InputAdornment>,
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>

          {/* General Invoice Numbering */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              General Invoice Numbering
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Invoice Prefix"
              fullWidth
              value={invoiceConfig.numbering?.prefix || ''}
              onChange={(e) => handleNestedInputChange('numbering', 'prefix', e.target.value)}
              disabled={!isEditing}
              helperText="Prefix for general invoices (e.g., INV, BILL)"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Starting Number"
              fullWidth
              type="number"
              value={invoiceConfig.numbering?.startingNumber || 1}
              onChange={(e) => handleNestedInputChange('numbering', 'startingNumber', parseInt(e.target.value))}
              disabled={!isEditing}
              error={!!validationErrors.startingNumber}
              helperText={validationErrors.startingNumber || 'Next invoice number'}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={invoiceConfig.numbering?.autoIncrement || false}
                  onChange={(e) => handleNestedInputChange('numbering', 'autoIncrement', e.target.checked)}
                  disabled={!isEditing}
                />
              }
              label="Auto Increment"
            />
          </Grid>

          {/* NEW: GST Invoice Specific Numbering */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
              <InvoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              GST Invoice Numbering
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              These settings control the invoice numbers for GST invoices only. Non-GST invoices will use the general numbering above.
            </Alert>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="GST Invoice Prefix"
              fullWidth
              value={invoiceConfig.gstInvoiceNumbering?.prefix || ''}
              onChange={(e) => handleNestedInputChange('gstInvoiceNumbering', 'prefix', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.gstPrefix}
              helperText={validationErrors.gstPrefix || 'Prefix for GST invoices (e.g., GST-INV, GST)'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <InvoiceIcon color="error" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Current GST Invoice Number"
              fullWidth
              type="number"
              value={invoiceConfig.gstInvoiceNumbering?.currentNumber || 1}
              onChange={(e) => handleNestedInputChange('gstInvoiceNumbering', 'currentNumber', parseInt(e.target.value))}
              disabled={!isEditing}
              error={!!validationErrors.gstCurrentNumber}
              helperText={validationErrors.gstCurrentNumber || 'Next GST invoice number'}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={invoiceConfig.gstInvoiceNumbering?.autoIncrement || false}
                  onChange={(e) => handleNestedInputChange('gstInvoiceNumbering', 'autoIncrement', e.target.checked)}
                  disabled={!isEditing}
                />
              }
              label="Auto Increment GST Numbers"
            />
          </Grid>

          {/* Preview of next invoice numbers */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Preview Next Invoice Numbers
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Next General Invoice:</Typography>
                    <Typography variant="h6" color="primary.main">
                      {invoiceConfig.numbering?.prefix || 'INV'}-{invoiceConfig.numbering?.startingNumber || 1}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Next GST Invoice:</Typography>
                    <Typography variant="h6" color="error.main">
                      {invoiceConfig.gstInvoiceNumbering?.prefix || 'GST-INV'}-{invoiceConfig.gstInvoiceNumbering?.currentNumber || 1}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Invoice Format Options */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Invoice Format Options
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={invoiceConfig.invoiceFormat?.showCompanyLogo || false}
                      onChange={(e) => handleNestedInputChange('invoiceFormat', 'showCompanyLogo', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Show Company Logo"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={invoiceConfig.invoiceFormat?.showBankDetails || false}
                      onChange={(e) => handleNestedInputChange('invoiceFormat', 'showBankDetails', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Show Bank Details"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={invoiceConfig.invoiceFormat?.showTerms || false}
                      onChange={(e) => handleNestedInputChange('invoiceFormat', 'showTerms', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Show Terms"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={invoiceConfig.invoiceFormat?.showSignature || false}
                      onChange={(e) => handleNestedInputChange('invoiceFormat', 'showSignature', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Show Signature"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Terms & Conditions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Terms & Conditions
              </Typography>
              {isEditing && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setTermsDialogOpen(true)}
                >
                  Add Term
                </Button>
              )}
            </Box>

            <List dense>
              {invoiceConfig.terms?.map((term, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={`${index + 1}. ${term}`}
                  />
                  {isEditing && (
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleEditTerm(index)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTerm(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </Box>

      {/* Terms Dialog */}
      <Dialog open={termsDialogOpen} onClose={handleCloseTermsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTerm !== null ? 'Edit Term' : 'Add New Term'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Term & Condition"
            fullWidth
            multiline
            rows={3}
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Enter term & condition..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTermsDialog}>Cancel</Button>
          <Button 
            onClick={editingTerm !== null ? handleUpdateTerm : handleAddTerm}
            variant="contained"
            disabled={!newTerm.trim()}
          >
            {editingTerm !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceConfigSettings;