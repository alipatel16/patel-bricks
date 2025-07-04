// Create this as CompanyInfoSettings.js in your components/settings/ folder

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CorporateFare as GSTIcon,
} from '@mui/icons-material';
import { DEFAULT_COMPANY_INFO, INDIAN_STATES, VALIDATION_RULES } from '../../utils/constants';
import { dbUtils } from '../../services/firebase';
import toast from 'react-hot-toast';

const CompanyInfoSettings = () => {
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY_INFO);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const result = await dbUtils.readData('settings/company_info');
      
      if (result.success && result.data) {
        setCompanyInfo(result.data);
      } else {
        // Use defaults if no saved data
        setCompanyInfo(DEFAULT_COMPANY_INFO);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      setCompanyInfo(DEFAULT_COMPANY_INFO);
      toast.error('Failed to load company information');
    } finally {
      setLoading(false);
    }
  };

  const validateCompanyInfo = (info) => {
    const errors = {};

    // Company name validation
    if (!info.name || info.name.trim().length < 2) {
      errors.name = 'Company name must be at least 2 characters';
    }

    // Address validation
    if (!info.address || info.address.trim().length < 10) {
      errors.address = 'Address must be at least 10 characters';
    }

    // Phone validation
    if (info.phone && info.phone.length > 0) {
      const invalidPhones = info.phone.filter(phone => 
        !VALIDATION_RULES.PHONE_REGEX.test(phone)
      );
      if (invalidPhones.length > 0) {
        errors.phone = 'Please enter valid phone numbers';
      }
    }

    // Email validation
    if (!info.email || !VALIDATION_RULES.EMAIL_REGEX.test(info.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // GSTIN validation
    if (!info.gstin || !VALIDATION_RULES.GSTIN_REGEX.test(info.gstin)) {
      errors.gstin = 'Please enter a valid GSTIN (15 characters)';
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    setCompanyInfo(prev => ({
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

  const handlePhoneChange = (index, value) => {
    const newPhones = [...companyInfo.phone];
    newPhones[index] = value;
    handleInputChange('phone', newPhones);
  };

  const addPhoneNumber = () => {
    if (companyInfo.phone.length < 3) {
      handleInputChange('phone', [...companyInfo.phone, '']);
    }
  };

  const removePhoneNumber = (index) => {
    if (companyInfo.phone.length > 1) {
      const newPhones = companyInfo.phone.filter((_, i) => i !== index);
      handleInputChange('phone', newPhones);
    }
  };

  const handleStateChange = (stateCode) => {
    const state = Object.entries(INDIAN_STATES).find(([key, value]) => key === stateCode);
    if (state) {
      setCompanyInfo(prev => ({
        ...prev,
        state: state[1].name,
        stateCode: state[1].code,
      }));
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationErrors({});
    loadCompanyInfo(); // Reset to saved data
  };

  const handleSave = async () => {
    const errors = validateCompanyInfo(companyInfo);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setSaving(true);
      const result = await dbUtils.writeData('settings/company_info', companyInfo);
      
      if (result.success) {
        setIsEditing(false);
        setValidationErrors({});
        toast.success('Company information saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      toast.error('Failed to save company information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading company information...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Company Information
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
          This information will appear on all invoices, documents, and reports.
        </Alert>

        <Grid container spacing={3}>
          {/* Company Name */}
          <Grid item xs={12}>
            <TextField
              label="Company Name"
              fullWidth
              required
              value={companyInfo.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <TextField
              label="Company Address"
              fullWidth
              required
              multiline
              rows={3}
              value={companyInfo.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.address}
              helperText={validationErrors.address || 'Complete address for invoices'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationIcon sx={{ alignSelf: 'flex-start', mt: 1 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Phone Numbers */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Phone Numbers
            </Typography>
            {companyInfo.phone.map((phone, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label={`Phone ${index + 1}`}
                  fullWidth
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  disabled={!isEditing}
                  error={!!validationErrors.phone}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                {isEditing && companyInfo.phone.length > 1 && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removePhoneNumber(index)}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    ×
                  </Button>
                )}
              </Box>
            ))}
            {isEditing && companyInfo.phone.length < 3 && (
              <Button
                variant="outlined"
                onClick={addPhoneNumber}
                size="small"
                sx={{ mt: 1 }}
              >
                Add Phone Number
              </Button>
            )}
            {validationErrors.phone && (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                {validationErrors.phone}
              </Typography>
            )}
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Email Address"
              fullWidth
              required
              type="email"
              value={companyInfo.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* GSTIN */}
          <Grid item xs={12} md={6}>
            <TextField
              label="GSTIN"
              fullWidth
              required
              value={companyInfo.gstin || ''}
              onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
              disabled={!isEditing}
              error={!!validationErrors.gstin}
              helperText={validationErrors.gstin || 'Goods and Services Tax Identification Number'}
              inputProps={{
                style: { textTransform: 'uppercase' },
                maxLength: 15
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <GSTIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* State Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!isEditing}>
              <InputLabel>State</InputLabel>
              <Select
                value={Object.keys(INDIAN_STATES).find(key => 
                  INDIAN_STATES[key].name === companyInfo.state
                ) || 'GJ'}
                label="State"
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {Object.entries(INDIAN_STATES).map(([key, state]) => (
                  <MenuItem key={key} value={key}>
                    {state.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* State Code */}
          <Grid item xs={12} md={6}>
            <TextField
              label="State Code"
              fullWidth
              value={companyInfo.stateCode || ''}
              disabled
              helperText="Auto-filled based on selected state"
            />
          </Grid>
        </Grid>

        {/* Preview Section */}
        <Divider sx={{ my: 4 }} />
        
        <Typography variant="h6" gutterBottom>
          Invoice Preview
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          This is how the company information will appear on invoices:
        </Alert>

        <Box sx={{ 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 1, 
          p: 2, 
          bgcolor: 'grey.50' 
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {companyInfo.name || 'Company Name'}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            MANUFACTURER OF FLY ASH BRICKS
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {companyInfo.address || 'Company Address'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Mo: {companyInfo.phone.join(', ')} | E-mail: {companyInfo.email}
          </Typography>
          <Typography variant="body2">
            GSTIN: {companyInfo.gstin} | State Code: {companyInfo.stateCode}
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

export default CompanyInfoSettings;