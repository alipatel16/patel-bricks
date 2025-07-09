// Create this as InvoiceConfigSettings.js in your components/settings/ folder

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
        setInvoiceConfig(result.data);
      } else {
        // Use defaults if no saved data
        setInvoiceConfig(DEFAULT_INVOICE_CONFIG);
      }
    } catch (error) {
      
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
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      
      toast.error('Failed to save invoice configuration');
    } finally {
      setSaving(false);
    }
  };

  // Terms & Conditions Management
  const handleAddTerm = () => {
    if (newTerm.trim()) {
      setInvoiceConfig(prev => ({
        ...prev,
        terms: [...prev.terms, newTerm.trim()]
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
      setEditingTerm(null);
      setNewTerm('');
      setTermsDialogOpen(false);
    }
  };

  const handleDeleteTerm = (index) => {
    const updatedTerms = invoiceConfig.terms.filter((_, i) => i !== index);
    setInvoiceConfig(prev => ({
      ...prev,
      terms: updatedTerms
    }));
  };

  const closeTermsDialog = () => {
    setTermsDialogOpen(false);
    setEditingTerm(null);
    setNewTerm('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading invoice configuration...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Invoice Configuration
            </Typography>
            
            <Box>
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

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={invoiceConfig.reverseCharge || false}
                    onChange={(e) => handleInputChange('reverseCharge', e.target.checked)}
                    disabled={!isEditing}
                  />
                }
                label="Reverse Charge Applicable"
              />
            </Grid>

            {/* GST Rates */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                GST Rates (%)
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

            {/* Invoice Numbering */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Invoice Numbering
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Invoice Prefix"
                fullWidth
                value={invoiceConfig.numbering?.prefix || ''}
                onChange={(e) => handleNestedInputChange('numbering', 'prefix', e.target.value)}
                disabled={!isEditing}
                helperText="Prefix for invoice numbers (e.g., INV, BILL)"
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
                          edge="end"
                          size="small"
                          onClick={() => handleEditTerm(index)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTerm(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>

          {isEditing && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              Remember to save your changes before leaving this page.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Terms Dialog */}
      <Dialog open={termsDialogOpen} onClose={closeTermsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTerm !== null ? 'Edit Term' : 'Add New Term'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Term & Condition"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTermsDialog}>Cancel</Button>
          <Button
            onClick={editingTerm !== null ? handleUpdateTerm : handleAddTerm}
            variant="contained"
            disabled={!newTerm.trim()}
          >
            {editingTerm !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvoiceConfigSettings;