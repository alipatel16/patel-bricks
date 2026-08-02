import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import LoadingState from '../components/common/LoadingState';
import { migrationService } from '../services/migrationService';
import { settingsService } from '../services/settingsService';

const labelForKey = (key) => key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').trim();
const vehicleBlank = { id: '', number: '', driver: '', capacity: '', notes: '' };
const editableTabs = ['company', 'invoice', 'bank', 'notifications'];

const SettingsPage = () => {
  const [tab, setTab] = useState('company');
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [vehicleDialog, setVehicleDialog] = useState({ open: false, vehicle: null });
  const [vehicleForm, setVehicleForm] = useState(vehicleBlank);

  const load = useCallback(async () => {
    const [settingsResult, statusResult] = await Promise.all([
      settingsService.getAll(),
      migrationService.getStatus(),
    ]);
    if (settingsResult.success) setSettings(settingsResult.data);
    else toast.error(settingsResult.error);
    if (statusResult.success) setStatus(statusResult.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (section, key, value) => {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  };

  const updateInvoiceFormat = (key, value) => {
    setSettings((current) => ({
      ...current,
      invoice: {
        ...current.invoice,
        invoiceFormat: {
          ...(current.invoice.invoiceFormat || {}),
          [key]: value,
        },
      },
    }));
  };

  const save = async () => {
    if (!editableTabs.includes(tab)) return;
    setBusy(true);
    const result = await settingsService.saveSection(tab, settings[tab]);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    return toast.success(`${tab[0].toUpperCase()}${tab.slice(1)} settings saved.`);
  };

  const inspect = async () => {
    setBusy(true);
    const result = await migrationService.inspectLegacy();
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setPreview(result.data);
    setVerification(null);
    return toast.success('Legacy database inspected.');
  };

  const migrate = async () => {
    setBusy(true);
    setVerification(null);
    setProgress({ completed: 0, total: preview?.totalWrites || 1 });
    const result = await migrationService.migrate({ force: true, onProgress: setProgress });
    setBusy(false);
    setProgress(null);
    if (!result.success) {
      await load();
      return toast.error(result.error);
    }
    toast.success('Realtime Database data migrated to Firestore.');
    setStatus(result.data);
    setPreview(null);
    await load();
    return null;
  };

  const verify = async () => {
    setBusy(true);
    const result = await migrationService.verify();
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setVerification(result.data);
    if (result.data.allPassed) return toast.success('Firestore migration verification passed.');
    return toast.error('Migration verification is incomplete. Review the failed checks.');
  };

  const openVehicle = (vehicle = null) => {
    setVehicleForm(vehicle ? { ...vehicle } : { ...vehicleBlank, id: `vehicle-${Date.now()}` });
    setVehicleDialog({ open: true, vehicle });
  };

  const saveVehicle = async () => {
    setBusy(true);
    const result = vehicleDialog.vehicle
      ? await settingsService.updateVehicle(vehicleDialog.vehicle.id, vehicleForm)
      : await settingsService.addVehicle(vehicleForm);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(vehicleDialog.vehicle ? 'Vehicle updated.' : 'Vehicle added.');
    setVehicleDialog({ open: false, vehicle: null });
    await load();
    return null;
  };

  const deleteVehicle = async (vehicle) => {
    setBusy(true);
    const result = await settingsService.deleteVehicle(vehicle.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Vehicle removed.');
    await load();
    return null;
  };

  if (!settings) return <LoadingState label="Loading settings…" />;

  const headerAction = editableTabs.includes(tab) ? (
    <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={busy}>Save {tab}</Button>
  ) : tab === 'vehicles' ? (
    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openVehicle()}>Add vehicle</Button>
  ) : null;

  return (
    <>
      <PageHeader eyebrow="Settings" title="Business, invoice and app settings" description="Company identity, invoice numbering, vehicle master, bank details, alerts and migration controls are managed here." action={headerAction} />
      <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 3 }}>
          <Tab value="company" label="Company" />
          <Tab value="invoice" label="Invoice" />
          <Tab value="vehicles" label="Vehicles" />
          <Tab value="bank" label="Bank" />
          <Tab value="notifications" label="Alerts" />
          <Tab value="data" label="Data & migration" />
          <Tab value="about" label="About" />
        </Tabs>

        {tab === 'company' && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Company name" value={settings.company.name} onChange={(event) => updateField('company', 'name', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Phone numbers" value={settings.company.phone} onChange={(event) => updateField('company', 'phone', event.target.value)} helperText="Separate multiple numbers with commas." /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Address" value={settings.company.address} onChange={(event) => updateField('company', 'address', event.target.value)} multiline minRows={2} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={settings.company.email} onChange={(event) => updateField('company', 'email', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="GSTIN" value={settings.company.gstin} onChange={(event) => updateField('company', 'gstin', event.target.value.toUpperCase())} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="State" value={settings.company.state} onChange={(event) => updateField('company', 'state', event.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="State code" value={settings.company.stateCode} onChange={(event) => updateField('company', 'stateCode', event.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Transportation mode" value={settings.company.transportationMode || ''} onChange={(event) => updateField('company', 'transportationMode', event.target.value)} /></Grid>
          </Grid>
        )}

        {tab === 'invoice' && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField fullWidth label="Sales reference prefix" value={settings.invoice.prefix} onChange={(event) => updateField('invoice', 'prefix', event.target.value.toUpperCase())} helperText="Operational sale references use B18-YYMM-###; this is separate from GST invoice numbering." /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="GST invoice prefix" value={settings.invoice.gstInvoicePrefix || ''} onChange={(event) => updateField('invoice', 'gstInvoicePrefix', event.target.value.toUpperCase())} helperText="Used only by GST invoices generated from Customer Report." /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Next GST invoice number" value={settings.invoice.gstInvoiceCurrentNumber || 1} onChange={(event) => updateField('invoice', 'gstInvoiceCurrentNumber', Math.max(1, Math.trunc(Number(event.target.value) || 1)))} inputProps={{ min: 1, step: 1 }} helperText="Used only by GST invoices generated from Customer Report." /></Grid>
            <Grid item xs={12} md={4}><FormControlLabel control={<Switch checked={settings.invoice.gstInvoiceAutoIncrement !== false} onChange={(event) => updateField('invoice', 'gstInvoiceAutoIncrement', event.target.checked)} />} label="Auto-increment GST invoice number" /><Typography variant="caption" color="text.secondary" display="block">When enabled, the next number advances only after a GST invoice is saved. Non-GST invoices never consume a number.</Typography></Grid>
            <Grid item xs={12} md={4}><Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FAF8F4', height: '100%' }}><Typography variant="caption" color="text.secondary">Next GST invoice preview</Typography><Typography variant="h6">{String(settings.invoice.gstInvoicePrefix || 'C').trim().toUpperCase()}-{Math.max(1, Math.trunc(Number(settings.invoice.gstInvoiceCurrentNumber) || 1))}</Typography><Typography variant="caption" color="text.secondary">GST invoices only · non-GST invoices have no invoice number</Typography></Box></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Product name" value={settings.invoice.productName} onChange={(event) => updateField('invoice', 'productName', event.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="HSN code" value={settings.invoice.hsnCode} onChange={(event) => updateField('invoice', 'hsnCode', event.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Default brick rate" value={settings.invoice.defaultRate} onChange={(event) => updateField('invoice', 'defaultRate', Number(event.target.value))} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="CGST %" value={settings.invoice.cgstRate ?? 6} onChange={(event) => updateField('invoice', 'cgstRate', Number(event.target.value))} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="SGST %" value={settings.invoice.sgstRate ?? 6} onChange={(event) => updateField('invoice', 'sgstRate', Number(event.target.value))} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="IGST %" value={settings.invoice.igstRate ?? 12} onChange={(event) => updateField('invoice', 'igstRate', Number(event.target.value))} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Default transport mode" value={settings.invoice.defaultTransportMode || ''} onChange={(event) => updateField('invoice', 'defaultTransportMode', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={Boolean(settings.invoice.reverseCharge)} onChange={(event) => updateField('invoice', 'reverseCharge', event.target.checked)} />} label="Reverse charge applicable" /></Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px solid #E8E2D9', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>Invoice print format</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>These switches apply to regular sales invoices and GST/non-GST invoices generated from Customer Reports.</Typography>
                <Grid container spacing={1}>
                  {[
                    ['showCompanyLogo', 'Show company mark'],
                    ['showCustomerDetails', 'Show customer details'],
                    ['showBankDetails', 'Show bank details'],
                    ['showTerms', 'Show terms'],
                    ['showSignature', 'Show signature area'],
                  ].map(([key, label]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <FormControlLabel
                        control={<Switch checked={settings.invoice.invoiceFormat?.[key] !== false} onChange={(event) => updateInvoiceFormat(key, event.target.checked)} />}
                        label={label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Terms (one per line)" value={(settings.invoice.terms || []).join('\n')} onChange={(event) => updateField('invoice', 'terms', event.target.value.split('\n').map((term) => term.trim()).filter(Boolean))} multiline minRows={4} /></Grid>
          </Grid>
        )}

        {tab === 'vehicles' && (
          <Stack spacing={2}>
            <Alert severity="info">These vehicle numbers appear as selectable suggestions while raising or editing an invoice. Free typing is still allowed.</Alert>
            {(settings.invoice.vehicles || []).length === 0 ? <Alert severity="warning">No vehicles configured.</Alert> : (
              <Grid container spacing={1.5}>
                {(settings.invoice.vehicles || []).map((vehicle) => (
                  <Grid item xs={12} sm={6} lg={4} key={vehicle.id}>
                    <Box sx={{ p: 2, border: '1px solid #E8E2D9', borderRadius: 2, height: '100%' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box><Typography variant="h6">{vehicle.number}</Typography><Typography variant="body2" color="text.secondary">{vehicle.driver || 'No driver assigned'}</Typography>{vehicle.capacity && <Chip size="small" sx={{ mt: 1 }} label={`Capacity: ${vehicle.capacity}`} />}</Box>
                        <Stack direction="row"><Tooltip title="Edit"><IconButton onClick={() => openVehicle(vehicle)}><EditRoundedIcon /></IconButton></Tooltip><Tooltip title="Delete"><IconButton color="error" onClick={() => deleteVehicle(vehicle)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip></Stack>
                      </Stack>
                      {vehicle.notes && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{vehicle.notes}</Typography>}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Stack>
        )}

        {tab === 'bank' && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Bank name" value={settings.bank.bankName} onChange={(event) => updateField('bank', 'bankName', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Branch" value={settings.bank.branch} onChange={(event) => updateField('bank', 'branch', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Account number" value={settings.bank.accountNumber} onChange={(event) => updateField('bank', 'accountNumber', event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="IFSC code" value={settings.bank.ifscCode} onChange={(event) => updateField('bank', 'ifscCode', event.target.value.toUpperCase())} /></Grid>
          </Grid>
        )}

        {tab === 'notifications' && (
          <Grid container spacing={2}>
            {[
              ['lowStockAlerts', 'Low stock alerts'],
              ['productionReminders', 'Production reminders'],
              ['salesNotifications', 'Sales notifications'],
              ['dailyReports', 'Daily reports'],
              ['emailNotifications', 'Email notifications'],
              ['smsNotifications', 'SMS notifications'],
            ].map(([key, label]) => <Grid item xs={12} sm={6} key={key}><FormControlLabel control={<Switch checked={Boolean(settings.notifications[key])} onChange={(event) => updateField('notifications', key, event.target.checked)} />} label={label} /></Grid>)}
            <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Brick low-stock threshold" value={settings.notifications.brickStockAlert} onChange={(event) => updateField('notifications', 'brickStockAlert', Number(event.target.value))} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Cement low-stock threshold" value={settings.notifications.cementStockAlert} onChange={(event) => updateField('notifications', 'cementStockAlert', Number(event.target.value))} /></Grid>
          </Grid>
        )}

        {tab === 'data' && (
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
              <Box><Typography variant="h6">Realtime Database → Firestore migration</Typography><Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>Migration v6 restores customer locations/rates, vehicle settings, GST-only auto-increment settings and calculates brick stock using the same production-minus-sales formula as the old app. It also removes duplicate v4 inventory movements.</Typography></Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={inspect} disabled={busy}>Inspect legacy data</Button><Button variant="contained" startIcon={<CloudSyncRoundedIcon />} onClick={migrate} disabled={busy || !preview?.hasData}>Run migration</Button><Button variant="outlined" startIcon={<FactCheckRoundedIcon />} onClick={verify} disabled={busy || status?.status !== 'completed'}>Verify Firestore data</Button></Stack>
            </Stack>
            {progress && <Box><LinearProgress variant="determinate" value={Math.min(100, (progress.completed / Math.max(1, progress.total)) * 100)} /><Typography variant="caption" color="text.secondary">{progress.completed} of {progress.total} operations completed</Typography></Box>}
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><Alert severity={status?.status === 'completed' ? 'success' : status?.status === 'failed' ? 'error' : 'info'}><strong>Status:</strong> {status?.status || 'Not checked'}{status?.version ? ` · migration v${status.version}` : ''}{status?.error ? ` · ${status.error}` : ''}</Alert></Grid>
              <Grid item xs={12} md={6}>{preview ? <Alert severity={preview.hasData ? 'warning' : 'info'}>{preview.hasData ? `${preview.totalWrites} Firestore operations prepared. Calculated brick stock: ${Number(preview.inventory?.bricks || 0).toLocaleString('en-IN')}.` : 'No legacy data found.'}</Alert> : <Alert severity="info">Inspect first, run migration, then verify.</Alert>}</Grid>
            </Grid>
            {preview?.counts && <Grid container spacing={1.5}>{Object.entries(preview.counts).map(([key, value]) => <Grid item xs={6} sm={4} md={2} key={key}><Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FAF8F4', height: '100%' }}><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{labelForKey(key)}</Typography><Typography variant="h6">{value}</Typography></Box></Grid>)}</Grid>}
            {verification && <Box><Alert severity={verification.allPassed ? 'success' : 'warning'}>{verification.allPassed ? 'Verification passed, including exact brick stock.' : `Verification did not pass. Current migration status: ${verification.status}.`}</Alert>{verification.checks?.length > 0 && <Grid container spacing={1.5} sx={{ mt: 0.5 }}>{verification.checks.map((check) => <Grid item xs={12} sm={6} md={4} lg={3} key={check.key}><Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: check.passed ? 'success.light' : 'error.light', bgcolor: check.passed ? 'rgba(46,125,50,.05)' : 'rgba(211,47,47,.05)' }}><Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>{labelForKey(check.key)}</Typography><Typography variant="body2" color="text.secondary">Expected {check.expected} · Found {check.actual}</Typography></Box></Grid>)}</Grid>}</Box>}
          </Stack>
        )}

        {tab === 'about' && (
          <Stack spacing={1.5}><Typography variant="h5">Brick Production Manager</Typography><Typography color="text.secondary">Firestore edition · design and reporting update v2.3.0</Typography><Alert severity="info">Customer and supplier directories remain server-paginated. Autocomplete searches start after two characters and return at most eight results. Dashboard and reports use aggregate documents rather than scanning complete collections.</Alert></Stack>
        )}
      </CardContent></Card>

      <Dialog open={vehicleDialog.open} onClose={() => setVehicleDialog({ open: false, vehicle: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{vehicleDialog.vehicle ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Vehicle number" value={vehicleForm.number} onChange={(event) => setVehicleForm((current) => ({ ...current, number: event.target.value.toUpperCase() }))} required /><TextField label="Driver" value={vehicleForm.driver} onChange={(event) => setVehicleForm((current) => ({ ...current, driver: event.target.value }))} /><TextField label="Capacity" value={vehicleForm.capacity} onChange={(event) => setVehicleForm((current) => ({ ...current, capacity: event.target.value }))} /><TextField label="Notes" value={vehicleForm.notes} onChange={(event) => setVehicleForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} /></Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setVehicleDialog({ open: false, vehicle: null })}>Cancel</Button><Button variant="contained" onClick={saveVehicle} disabled={busy}>Save vehicle</Button></DialogActions>
      </Dialog>
    </>
  );
};

export default SettingsPage;
