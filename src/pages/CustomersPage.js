import React, { useCallback, useMemo, useState } from 'react';
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
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditLocationAltRoundedIcon from '@mui/icons-material/EditLocationAltRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import CursorPagination from '../components/common/CursorPagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import StatusPill from '../components/data/StatusPill';
import { useCursorPager } from '../hooks/useCursorPager';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { customerService } from '../services/customerService';
import { formatCurrency } from '../services/queryUtils';

const blankCustomer = {
  name: '',
  phone: '',
  email: '',
  businessName: '',
  gstin: '',
  address: '',
  notes: '',
  status: 'active',
  locations: [],
  propagateHistory: true,
  updateHistoricalRates: true,
};

const blankLocation = {
  id: '',
  name: '',
  address: '',
  contactPerson: '',
  contactPhone: '',
  pincode: '',
  state: 'GJ',
  stateCode: '24',
  brickRate: '',
  isPrimary: false,
};

const CustomerLedgerDialog = ({ customer, onClose }) => {
  const [tab, setTab] = useState('sales');
  const loader = useCallback(({ cursor, pageSize }) => {
    if (tab === 'sales') return customerService.getCustomerSalesPage({ customerId: customer.id, cursor, pageSize });
    if (tab === 'payments') return customerService.getCustomerPaymentsPage({ customerId: customer.id, cursor, pageSize });
    return customerService.getCustomerLegacyInvoicesPage({ customerId: customer.id, cursor, pageSize });
  }, [customer.id, tab]);
  const pager = useCursorPager({ loader, dependencies: [customer.id, tab], pageSize: 8 });
  const columns = tab === 'sales' ? [
    { key: 'date', label: 'Date' },
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'location', label: 'Site' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'paidAmount', label: 'Paid', align: 'right', render: (row) => formatCurrency(row.paidAmount) },
    { key: 'balanceDue', label: 'Due', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
  ] : tab === 'payments' ? [
    { key: 'date', label: 'Date' },
    { key: 'invoiceNumber', label: 'Invoice', render: (row) => row.invoiceNumber || 'Customer payment' },
    { key: 'method', label: 'Method' },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount) },
  ] : [
    { key: 'date', label: 'Date' },
    { key: 'gstInvoiceNumber', label: 'GST invoice', render: (row) => row.gstInvoiceNumber || 'Non-GST' },
    { key: 'selectedSite', label: 'Site' },
    { key: 'totalBricks', label: 'Bricks', align: 'right' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
  ];
  return (
    <Dialog open={Boolean(customer)} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{customer.name} · Account and ledger</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#FAF8F4' }}>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Total invoiced</Typography><Typography variant="h6">{formatCurrency(customer.totalAmount)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Total paid</Typography><Typography variant="h6">{formatCurrency(customer.totalPaid)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Balance due</Typography><Typography variant="h6" color="warning.main">{formatCurrency(customer.balanceDue)}</Typography></Box>
        </Stack>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
          <Tab value="sales" label="Sales invoices" />
          <Tab value="payments" label="Payments" />
          <Tab value="legacyInvoices" label="Generated invoices" />
        </Tabs>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle={tab === 'sales' ? 'No sales invoices' : tab === 'payments' ? 'No payments' : 'No generated invoices'} mobileTitle={(row) => row.invoiceNumber || row.gstInvoiceNumber || row.date} mobileSubtitle={(row) => `${row.date} · ${formatCurrency(row.totalAmount || row.amount)}`} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};

const CustomersPage = () => {
  const [filters, setFilters] = useState({ searchTerm: '', status: 'all' });
  const debounced = useDebouncedValue(filters.searchTerm, 350);
  const effectiveSearch = debounced.trim().length >= 2 ? debounced.trim() : '';
  const [dialog, setDialog] = useState({ open: false, customer: null });
  const [form, setForm] = useState(blankCustomer);
  const [locationDialog, setLocationDialog] = useState({ open: false, index: -1 });
  const [locationForm, setLocationForm] = useState(blankLocation);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(({ cursor, pageSize }) => customerService.getCustomersPage({
    cursor,
    pageSize,
    searchTerm: effectiveSearch,
    status: filters.status,
  }), [effectiveSearch, filters.status]);
  const pager = useCursorPager({ loader, dependencies: [effectiveSearch, filters.status], pageSize: 10 });

  const openCreate = () => {
    setForm({ ...blankCustomer, locations: [] });
    setDialog({ open: true, customer: null });
  };

  const openEdit = (customer) => {
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      businessName: customer.businessName || '',
      gstin: customer.gstin || '',
      address: customer.address || '',
      notes: customer.notes || '',
      status: customer.status || 'active',
      locations: (customer.locations || []).map((location) => ({
        ...location,
        brickRate: location.brickRate ?? customer.brickRates?.[location.id] ?? '',
      })),
      propagateHistory: true,
      updateHistoricalRates: true,
    });
    setDialog({ open: true, customer });
  };

  const openLocation = (index = -1) => {
    const location = index >= 0 ? form.locations[index] : null;
    setLocationForm(location ? { ...blankLocation, ...location } : {
      ...blankLocation,
      id: `location-${Date.now()}`,
      isPrimary: form.locations.length === 0,
    });
    setLocationDialog({ open: true, index });
  };

  const saveLocation = () => {
    if (!locationForm.name.trim() || !locationForm.address.trim()) {
      return toast.error('Location name and address are required.');
    }
    setForm((current) => {
      let locations = [...current.locations];
      const nextLocation = {
        ...locationForm,
        name: locationForm.name.trim(),
        address: locationForm.address.trim(),
        brickRate: locationForm.brickRate === '' ? '' : Number(locationForm.brickRate),
      };
      if (locationDialog.index >= 0) locations[locationDialog.index] = nextLocation;
      else locations.push(nextLocation);
      if (nextLocation.isPrimary) {
        locations = locations.map((location) => ({ ...location, isPrimary: location.id === nextLocation.id }));
      } else if (!locations.some((location) => location.isPrimary)) {
        locations[0] = { ...locations[0], isPrimary: true };
      }
      const primary = locations.find((location) => location.isPrimary) || locations[0];
      return { ...current, locations, address: primary?.address || current.address };
    });
    setLocationDialog({ open: false, index: -1 });
  };

  const removeLocation = (index) => {
    setForm((current) => {
      let locations = current.locations.filter((_, currentIndex) => currentIndex !== index);
      if (locations.length && !locations.some((location) => location.isPrimary)) {
        locations = locations.map((location, currentIndex) => ({ ...location, isPrimary: currentIndex === 0 }));
      }
      const primary = locations.find((location) => location.isPrimary) || locations[0];
      return { ...current, locations, address: primary?.address || '' };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const { propagateHistory, updateHistoricalRates, ...customerInput } = form;
    const result = dialog.customer
      ? await customerService.updateCustomer(dialog.customer.id, customerInput, { propagateHistory, updateHistoricalRates })
      : await customerService.createCustomer(customerInput);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    if (dialog.customer && result.data.propagated) {
      const details = result.data.propagated;
      toast.success(`Customer updated across ${details.salesUpdated} sales and ${details.generatedInvoicesUpdated} generated invoices.`);
    } else {
      toast.success(dialog.customer ? 'Customer updated.' : 'Customer created.');
    }
    setDialog({ open: false, customer: null });
    pager.refresh();
    return null;
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await customerService.deleteCustomer(deleteCustomer.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(result.message || 'Customer removed.');
    setDeleteCustomer(null);
    pager.refresh();
    return null;
  };

  const actions = useCallback((row) => (
    <Stack direction="row" spacing={0.15}>
      <Tooltip title="Ledger"><IconButton size="small" color="primary" onClick={() => setLedgerCustomer(row)}><MenuBookRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Edit customer, sites and rates"><IconButton size="small" onClick={() => openEdit(row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteCustomer(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  ), []);

  const columns = useMemo(() => [
    { key: 'name', label: 'Customer', render: (row) => <Box><Typography variant="body2" sx={{ fontWeight: 800 }}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.businessName || row.phone}</Typography></Box> },
    { key: 'phone', label: 'Phone' },
    { key: 'locations', label: 'Sites', render: (row) => <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>{(row.locations || []).slice(0, 2).map((location) => <Chip key={location.id} size="small" label={`${location.name}${row.brickRates?.[location.id] ? ` · ₹${row.brickRates[location.id]}` : ''}`} />)}{(row.locations || []).length > 2 && <Chip size="small" label={`+${row.locations.length - 2}`} />}</Stack> },
    { key: 'totalAmount', label: 'Purchased', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'balanceDue', label: 'Balance', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', label: '', align: 'right', render: actions, mobileHidden: true },
  ], [actions]);

  return (
    <>
      <PageHeader eyebrow="Customers" title="Customer accounts, sites and rates" description="Customer search starts after two characters. Each customer can have multiple delivery sites with an individual brick rate, while all lists remain cursor-paginated." action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>Add customer</Button>} />
      <Card><CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2.25 }}>
          <TextField label="Search name, phone, GSTIN or site" value={filters.searchTerm} onChange={(event) => setFilters((current) => ({ ...current, searchTerm: event.target.value }))} helperText={filters.searchTerm.length === 1 ? 'Enter one more character.' : 'Search starts after 2 characters.'} sx={{ minWidth: { sm: 320 } }} />
          <TextField select label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} sx={{ minWidth: 140 }}><MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>
          <Button onClick={() => setFilters({ searchTerm: '', status: 'all' })}>Clear</Button>
        </Stack>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No customers found" mobileTitle={(row) => row.name} mobileSubtitle={(row) => `${row.locations?.length || 0} sites · ${formatCurrency(row.balanceDue)} due`} mobileActions={actions} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </CardContent></Card>

      <Dialog open={dialog.open} onClose={busy ? undefined : () => setDialog({ open: false, customer: null })} maxWidth="md" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{dialog.customer ? 'Edit customer, locations and rates' : 'Add customer'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Customer name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required fullWidth /><TextField label="Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} fullWidth /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Business name" value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} fullWidth /><TextField label="GSTIN" value={form.gstin} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} fullWidth /></Stack>
              <TextField select label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField>

              <Divider />
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                <Box><Typography variant="h6">Delivery locations</Typography><Typography variant="body2" color="text.secondary">Set a separate brick rate for every customer site. Selecting that site on an invoice fills the rate automatically.</Typography></Box>
                <Button startIcon={<AddLocationAltRoundedIcon />} onClick={() => openLocation()}>Add location</Button>
              </Stack>
              {form.locations.length === 0 ? (
                <Alert severity="info">No locations added. Add at least one site to use automatic location pricing.</Alert>
              ) : (
                <Stack spacing={1}>
                  {form.locations.map((location, index) => (
                    <Box key={location.id} sx={{ p: 1.5, border: '1px solid #E8E2D9', borderRadius: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 800 }}>{location.name}</Typography>
                            {location.isPrimary && <Chip size="small" color="primary" label="Primary" />}
                            {location.brickRate !== '' && <Chip size="small" color="success" variant="outlined" label={`₹${location.brickRate}/brick`} />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">{location.address}</Typography>
                          {(location.contactPerson || location.contactPhone) && <Typography variant="caption" color="text.secondary">{location.contactPerson}{location.contactPerson && location.contactPhone ? ' · ' : ''}{location.contactPhone}</Typography>}
                        </Box>
                        <Stack direction="row"><IconButton onClick={() => openLocation(index)}><EditLocationAltRoundedIcon /></IconButton><IconButton color="error" onClick={() => removeLocation(index)}><DeleteOutlineRoundedIcon /></IconButton></Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              <TextField label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} />
              {dialog.customer && (
                <Box sx={{ p: 1.5, bgcolor: '#FAF8F4', borderRadius: 2 }}>
                  <FormControlLabel control={<Switch checked={form.propagateHistory} onChange={(event) => setForm((current) => ({ ...current, propagateHistory: event.target.checked }))} />} label="Update customer name, phone, GSTIN and site information in historical sales, payments and generated invoices" />
                  <FormControlLabel disabled={!form.propagateHistory} control={<Switch checked={form.updateHistoricalRates} onChange={(event) => setForm((current) => ({ ...current, updateHistoricalRates: event.target.checked }))} />} label="Also recalculate matching historical sales and generated invoices when a site rate changes" />
                  <Typography variant="caption" color="text.secondary">This is an explicit on-demand update. Only records belonging to this customer are read and changed.</Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDialog({ open: false, customer: null })}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving and updating history…' : 'Save customer'}</Button></DialogActions>
        </form>
      </Dialog>

      <Dialog open={locationDialog.open} onClose={() => setLocationDialog({ open: false, index: -1 })} maxWidth="sm" fullWidth>
        <DialogTitle>{locationDialog.index >= 0 ? 'Edit delivery location' : 'Add delivery location'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Location / site name" value={locationForm.name} onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))} required fullWidth /><TextField label="Brick rate" type="number" value={locationForm.brickRate} onChange={(event) => setLocationForm((current) => ({ ...current, brickRate: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} fullWidth /></Stack>
          <TextField label="Address" value={locationForm.address} onChange={(event) => setLocationForm((current) => ({ ...current, address: event.target.value }))} required multiline minRows={2} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Contact person" value={locationForm.contactPerson} onChange={(event) => setLocationForm((current) => ({ ...current, contactPerson: event.target.value }))} fullWidth /><TextField label="Contact phone" value={locationForm.contactPhone} onChange={(event) => setLocationForm((current) => ({ ...current, contactPhone: event.target.value }))} fullWidth /></Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Pincode" value={locationForm.pincode} onChange={(event) => setLocationForm((current) => ({ ...current, pincode: event.target.value }))} fullWidth /><TextField label="State" value={locationForm.state} onChange={(event) => setLocationForm((current) => ({ ...current, state: event.target.value }))} fullWidth /><TextField label="State code" value={locationForm.stateCode} onChange={(event) => setLocationForm((current) => ({ ...current, stateCode: event.target.value }))} fullWidth /></Stack>
          <FormControlLabel control={<Switch checked={locationForm.isPrimary} onChange={(event) => setLocationForm((current) => ({ ...current, isPrimary: event.target.checked }))} />} label="Primary delivery location" />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setLocationDialog({ open: false, index: -1 })}>Cancel</Button><Button variant="contained" onClick={saveLocation}>Save location</Button></DialogActions>
      </Dialog>

      {ledgerCustomer && <CustomerLedgerDialog customer={ledgerCustomer} onClose={() => setLedgerCustomer(null)} />}
      <ConfirmDialog open={Boolean(deleteCustomer)} title="Remove this customer?" description="Customers with invoice history are marked inactive instead of being deleted, preserving the ledger." busy={busy} onClose={() => setDeleteCustomer(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default CustomersPage;
