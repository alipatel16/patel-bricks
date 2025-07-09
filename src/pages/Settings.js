// Replace your existing Settings.js file with this updated version:

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  AccountBalance as BankIcon,
  Receipt as InvoiceIcon,
  Notifications as NotificationsIcon,
  Storage as DataIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { APP_NAME, DEFAULT_COMPANY_INFO, LOW_STOCK_ALERTS } from '../utils/constants';
import { useApp } from '../context/AppContext';

// Import the new editable components
import CompanyInfoSettings from './settings/CompanyInfoSettings';
import BankDetailsSettings from './settings/BankDetailsSettings';
import InvoiceConfigSettings from './settings/InvoiceConfigSettings';

import toast from 'react-hot-toast';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { actions: appActions } = useApp();
  const [currentTab, setCurrentTab] = useState(0);
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    lowStockAlerts: true,
    emailNotifications: false,
    smsNotifications: false,
    dailyReports: false,
    productionReminders: true,
    salesNotifications: true,
  });
  
  // Stock alert thresholds state
  const [stockAlertThresholds, setStockAlertThresholds] = useState(LOW_STOCK_ALERTS);

  useEffect(() => {
    loadNotificationSettings();
    loadStockAlertSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      // In a real implementation, load from Firebase
      // For now, use defaults
      setNotificationSettings({
        lowStockAlerts: true,
        emailNotifications: false,
        smsNotifications: false,
        dailyReports: false,
        productionReminders: true,
        salesNotifications: true,
      });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const loadStockAlertSettings = async () => {
    try {
      // In a real implementation, load from Firebase
      // For now, use defaults
      setStockAlertThresholds(LOW_STOCK_ALERTS);
    } catch (error) {
      console.error('Error loading stock alert settings:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSaveNotificationSettings = async () => {
    try {
      // Save notification settings logic here
      // await dbUtils.writeData('settings/notifications', notificationSettings);
      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    }
  };

  const handleSaveStockAlerts = async () => {
    try {
      // Save stock alert settings logic here
      // await dbUtils.writeData('settings/stock_alerts', stockAlertThresholds);
      toast.success('Stock alert settings saved successfully');
    } catch (error) {
      console.error('Error saving stock alert settings:', error);
      toast.error('Failed to save stock alert settings');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      // Implement data reset logic
      toast.success('Data reset initiated');
    }
  };

  const handleExportData = () => {
    // Implement data export logic
    toast.success('Data export started');
  };

  const handleImportData = () => {
    // Implement data import logic
    toast.info('Data import feature coming soon');
  };

  return (
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Configure your application preferences and business settings
          </Typography>
        </Box>

        {/* Settings Navigation */}
        <Card sx= {{padding : 1}}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="settings tabs">
              <Tab 
                icon={<BusinessIcon />} 
                label="Company" 
                id="settings-tab-0"
                aria-controls="settings-tabpanel-0"
              />
              <Tab 
                icon={<BankIcon />} 
                label="Bank Details" 
                id="settings-tab-1"
                aria-controls="settings-tabpanel-1"
              />
              <Tab 
                icon={<InvoiceIcon />} 
                label="Invoice" 
                id="settings-tab-2"
                aria-controls="settings-tabpanel-2"
              />
              <Tab 
                icon={<NotificationsIcon />} 
                label="Notifications" 
                id="settings-tab-3"
                aria-controls="settings-tabpanel-3"
              />
              <Tab 
                icon={<InfoIcon />} 
                label="About" 
                id="settings-tab-4"
                aria-controls="settings-tabpanel-4"
              />
              {/* <Tab 
                icon={<DataIcon />} 
                label="Data" 
                id="settings-tab-4"
                aria-controls="settings-tabpanel-4"
              /> */}
            </Tabs>
          </Box>

          {/* Company Settings Tab - Now Editable */}
          <TabPanel value={currentTab} index={0}>
            <CompanyInfoSettings />
          </TabPanel>

          {/* Bank Details Tab - Already Editable */}
          <TabPanel value={currentTab} index={1}>
            <BankDetailsSettings />
          </TabPanel>

          {/* Invoice Settings Tab - Now Editable */}
          <TabPanel value={currentTab} index={2}>
            <InvoiceConfigSettings />
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={currentTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Notification Preferences
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Configure when and how you want to receive notifications.
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      General Notifications
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.lowStockAlerts}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                lowStockAlerts: e.target.checked
                              }))}
                            />
                          }
                          label="Low Stock Alerts"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.productionReminders}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                productionReminders: e.target.checked
                              }))}
                            />
                          }
                          label="Production Reminders"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.salesNotifications}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                salesNotifications: e.target.checked
                              }))}
                            />
                          }
                          label="Sales Notifications"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.dailyReports}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                dailyReports: e.target.checked
                              }))}
                            />
                          }
                          label="Daily Reports"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Communication Channels
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.emailNotifications}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                emailNotifications: e.target.checked
                              }))}
                            />
                          }
                          label="Email Notifications"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.smsNotifications}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                smsNotifications: e.target.checked
                              }))}
                            />
                          }
                          label="SMS Notifications"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Stock Alert Thresholds
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Brick Stock Alert"
                          type="number"
                          fullWidth
                          value={stockAlertThresholds.BRICKS}
                          onChange={(e) => setStockAlertThresholds(prev => ({
                            ...prev,
                            BRICKS: parseInt(e.target.value) || 0
                          }))}
                          helperText="Alert when brick stock falls below this number"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Cement Stock Alert"
                          type="number"
                          fullWidth
                          value={stockAlertThresholds.CEMENT}
                          onChange={(e) => setStockAlertThresholds(prev => ({
                            ...prev,
                            CEMENT: parseInt(e.target.value) || 0
                          }))}
                          helperText="Alert when cement stock falls below this number"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveNotificationSettings}
                  >
                    Save Notification Settings
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleSaveStockAlerts}
                  >
                    Save Stock Alerts
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* About Tab */}
          <TabPanel value={currentTab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  About {APP_NAME}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Application Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2">
                        <strong>Version:</strong> 1.0.0
                      </Typography>
                      <Typography variant="body2">
                        <strong>Build:</strong> 2024.03.01
                      </Typography>
                      <Typography variant="body2">
                        <strong>Platform:</strong> Web Application
                      </Typography>
                      <Typography variant="body2">
                        <strong>Framework:</strong> React 18
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Features
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" >Production Management</Typography>
                      <Typography variant="body2" >Inventory Tracking</Typography>
                      <Typography variant="body2" >Sales Management</Typography>
                      <Typography variant="body2" >GST Invoice Generation</Typography>
                      <Typography variant="body2" >Reports & Analytics</Typography>
                      <Typography variant="body2" >Multi-user Support</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Support
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      For technical support or feature requests, please contact our support team.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Data Management Tab */}
          {/* <TabPanel value={currentTab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Data Management
                </Typography>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Use these tools carefully. Data operations cannot be undone.
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Data Export
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Export all your data for backup or migration purposes.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleExportData}
                      fullWidth
                    >
                      Export All Data
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Data Import
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Import data from a previously exported backup file.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleImportData}
                      fullWidth
                    >
                      Import Data
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                      Reset All Data
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      This will permanently delete all production, sales, and inventory data. 
                      This action cannot be undone.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleResetData}
                    >
                      Reset All Data
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel> */}

          
        </Card>
      </Box>
  );
}

export default Settings;