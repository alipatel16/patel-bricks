import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import CursorPagination from '../components/common/CursorPagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import StatusPill from '../components/data/StatusPill';
import AsyncSearchField from '../components/forms/AsyncSearchField';
import CustomerReportPanel from '../components/sales/CustomerReportPanel';
import InvoiceDocument from '../components/sales/InvoiceDocument';
import InvoiceReportsPanel from '../components/sales/InvoiceReportsPanel';
import { useCursorPager } from '../hooks/useCursorPager';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { customerService } from '../services/customerService';
import { salesService } from '../services/salesService';
import { settingsService } from '../services/settingsService';
import { dateKey, formatCurrency, formatNumber } from '../services/queryUtils';

const SalesSummaryCard = ({ label, value, caption }) => (
  <Card sx={{ height: '100%', minWidth: 0, minHeight: { xs: 132, md: 144 } }}>
    <CardContent
      sx={{
        p: { xs: 2.2, md: 2.5 },
        height: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: '24px minmax(44px, auto) 22px',
        alignContent: 'space-between',
        '&:last-child': { pb: { xs: 2.2, md: 2.5 } },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 750, lineHeight: '24px' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          alignSelf: 'center',
          minWidth: 0,
          fontSize: { xs: '1.55rem', lg: '1.82rem' },
          lineHeight: 1.08,
          fontWeight: 850,
          letterSpacing: '-.025em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {caption}
      </Typography>
    </CardContent>
  </Card>
);

const blankInvoice = (defaultRate = 2.5) => ({
  date: dateKey(), customer: null, location: null, vehicleNumber: '', challanNumber: '', quantity: '', rate: defaultRate,
  discount: 0, isGst: false, interstate: false, paidAmount: 0, paymentMethod: 'cash', notes: '',
});

const blankQuickCustomer = () => ({ name: '', phone: '', email: '', gstin: '', businessName: '', siteName: '', siteAddress: '', brickRate: '' });

const primaryLocationFor = (customer) => customer?.locations?.find((location) => location.isPrimary) || customer?.locations?.[0] || null;
const rateForLocation = (customer, location, fallback) => {
  const value = customer?.brickRates?.[location?.id] ?? location?.brickRate;
  return value === '' || value === undefined || value === null ? fallback : Number(value);
};

const SalesPage = () => {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({ today: {}, month: {}, all: {} });
  const [filters, setFilters] = useState({ searchTerm: '', dateFrom: '', dateTo: '', paymentStatus: 'all', gstOnly: false });
  const debouncedSearch = useDebouncedValue(filters.searchTerm, 350);
  const effectiveSearch = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : '';
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(blankInvoice());
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(blankQuickCustomer());
  const [viewerSale, setViewerSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', date: dateKey(), notes: '' });
  const [deleteSale, setDeleteSale] = useState(null);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [invoiceReportsRefresh, setInvoiceReportsRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const invoiceRef = useRef(null);

  const loadSupporting = useCallback(async () => {
    const [settingsResult, todayResult, monthResult, allResult] = await Promise.all([
      settingsService.getAll(),
      salesService.getSalesStats('today'),
      salesService.getSalesStats('month'),
      salesService.getSalesStats('all'),
    ]);
    if (settingsResult.success) {
      setSettings(settingsResult.data);
      setInvoiceForm((current) => ({ ...current, rate: current.rate || settingsResult.data.invoice.defaultRate }));
    }
    setStats({
      today: todayResult.success ? todayResult.data : {},
      month: monthResult.success ? monthResult.data : {},
      all: allResult.success ? allResult.data : {},
    });
  }, []);
  useEffect(() => { loadSupporting(); }, [loadSupporting]);

  const loader = useCallback(({ cursor, pageSize }) => salesService.getSalesPage({
    cursor, pageSize, ...filters, searchTerm: effectiveSearch,
  }), [effectiveSearch, filters.dateFrom, filters.dateTo, filters.paymentStatus, filters.gstOnly]);
  const pager = useCursorPager({
    loader,
    dependencies: [effectiveSearch, filters.dateFrom, filters.dateTo, filters.paymentStatus, filters.gstOnly],
    pageSize: 10,
  });

  const selectCustomer = useCallback((customer) => {
    const location = primaryLocationFor(customer);
    setInvoiceForm((current) => ({
      ...current,
      customer,
      location,
      rate: rateForLocation(customer, location, current.rate || settings?.invoice?.defaultRate || 2.5),
    }));
  }, [settings]);

  const selectLocation = useCallback((locationId) => {
    setInvoiceForm((current) => {
      const location = current.customer?.locations?.find((item) => item.id === locationId) || null;
      return { ...current, location, rate: rateForLocation(current.customer, location, current.rate) };
    });
  }, []);

  const openInvoice = () => {
    setEditingSale(null);
    setInvoiceForm(blankInvoice(settings?.invoice?.defaultRate || 2.5));
    setInvoiceOpen(true);
  };

  const openEdit = async (sale) => {
    setBusy(true);
    const customerResult = await customerService.getCustomerById(sale.customerId);
    setBusy(false);
    if (!customerResult.success || !customerResult.data) return toast.error(customerResult.error || 'Customer not found.');
    const customer = customerResult.data;
    const location = customer.locations?.find((item) => item.id === sale.locationId)
      || customer.locations?.find((item) => item.name?.trim().toLowerCase() === sale.location?.trim().toLowerCase())
      || primaryLocationFor(customer);
    setEditingSale(sale);
    setInvoiceForm({
      date: sale.date || dateKey(), customer, location, vehicleNumber: sale.vehicleNumber || '', challanNumber: sale.challanNumber || '',
      quantity: sale.quantity || '', rate: sale.rate || settings?.invoice?.defaultRate || 2.5, discount: sale.discountAmount || 0,
      isGst: Boolean(sale.isGst), interstate: Boolean(sale.interstate), paidAmount: sale.paidAmount || 0,
      paymentMethod: sale.paymentMethod || 'cash', notes: sale.notes || '',
    });
    setInvoiceOpen(true);
    return null;
  };

  const gstSettings = settings?.invoice || {};
  const calculated = useMemo(() => {
    const quantity = Number(invoiceForm.quantity || 0);
    const rate = Number(invoiceForm.rate || 0);
    const gross = quantity * rate;
    const taxable = Math.max(0, gross - Number(invoiceForm.discount || 0));
    const localGstRate = Number(gstSettings.cgstRate ?? 6) + Number(gstSettings.sgstRate ?? 6);
    const interstateGstRate = Number(gstSettings.igstRate ?? gstSettings.gstRate ?? 12);
    const gstRate = invoiceForm.interstate ? interstateGstRate : localGstRate;
    const gst = invoiceForm.isGst ? taxable * (gstRate / 100) : 0;
    return { gross, taxable, gst, gstRate, total: taxable + gst };
  }, [invoiceForm, gstSettings.cgstRate, gstSettings.sgstRate, gstSettings.igstRate, gstSettings.gstRate]);

  const submitInvoice = async (event) => {
    event.preventDefault();
    if (!invoiceForm.location) return toast.error('Select a customer location/site.');
    setBusy(true);
    const payload = {
      ...invoiceForm,
      paidAmount: editingSale ? editingSale.paidAmount : Math.min(calculated.total, Number(invoiceForm.paidAmount || 0)),
      productName: gstSettings.productName,
      hsnCode: gstSettings.hsnCode,
      invoicePrefix: gstSettings.prefix,
      gstRate: gstSettings.gstRate,
      cgstRate: gstSettings.cgstRate,
      sgstRate: gstSettings.sgstRate,
      igstRate: gstSettings.igstRate,
    };
    const result = editingSale ? await salesService.updateSale(editingSale.id, payload) : await salesService.recordSale(payload);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(editingSale ? `Invoice ${result.data.invoiceNumber} updated.` : `Invoice ${result.data.invoiceNumber} created.`);
    setInvoiceOpen(false);
    setEditingSale(null);
    setViewerSale(result.data);
    loadSupporting();
    pager.refresh();
    return null;
  };

  const submitQuickCustomer = async (event) => {
    event.preventDefault();
    const locationId = `location-${Date.now()}`;
    const location = { id: locationId, name: customerForm.siteName || 'Primary Site', address: customerForm.siteAddress, brickRate: customerForm.brickRate, isPrimary: true };
    setBusy(true);
    const result = await customerService.createCustomer({
      name: customerForm.name, phone: customerForm.phone, email: customerForm.email, gstin: customerForm.gstin,
      businessName: customerForm.businessName, address: customerForm.siteAddress, locations: [location], brickRates: { [locationId]: Number(customerForm.brickRate || gstSettings.defaultRate || 0) },
    });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Customer created and selected.');
    selectCustomer(result.data);
    setQuickCustomerOpen(false);
    setCustomerForm(blankQuickCustomer());
    return null;
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await salesService.recordPayment({ saleId: paymentSale.id, ...paymentForm });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Payment recorded.');
    setPaymentSale(null);
    setPaymentForm({ amount: '', method: 'cash', date: dateKey(), notes: '' });
    loadSupporting();
    pager.refresh();
    return null;
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await salesService.deleteSale(deleteSale.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Invoice deleted and brick stock restored.');
    setDeleteSale(null);
    loadSupporting();
    pager.refresh();
    return null;
  };

  const downloadPdf = async () => {
    if (!invoiceRef.current || !viewerSale) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;
      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - imageHeight) / 2;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imageWidth, imageHeight);
      pdf.save(`${viewerSale.invoiceNumber}.pdf`);
    } catch (error) { toast.error(error.message || 'Unable to create PDF.'); } finally { setBusy(false); }
  };

  const rowActions = useCallback((row) => <Stack direction="row" spacing={0.15}>
    <Tooltip title="View invoice"><IconButton size="small" onClick={() => setViewerSale(row)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Edit invoice"><IconButton size="small" color="primary" onClick={() => openEdit(row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
    {Number(row.balanceDue) > 0 && <Tooltip title="Record payment"><IconButton size="small" color="success" onClick={() => { setPaymentSale(row); setPaymentForm({ amount: row.balanceDue, method: 'cash', date: dateKey(), notes: '' }); }}><PaymentsRoundedIcon fontSize="small" /></IconButton></Tooltip>}
    <Tooltip title="Delete invoice"><IconButton size="small" color="error" onClick={() => setDeleteSale(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
  </Stack>, [settings]);

  const columns = useMemo(() => [
    { key: 'invoiceNumber', label: 'Invoice', nowrap: true, render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{row.invoiceNumber}</Typography><Typography variant="caption" color="text.secondary">{row.date}</Typography></Box> },
    { key: 'customerName', label: 'Customer', render: (row) => <Box><Typography sx={{ fontWeight: 700 }}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary">{row.location || 'No site'}</Typography></Box> },
    { key: 'quantity', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.quantity) },
    { key: 'vehicleNumber', label: 'Vehicle' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'balanceDue', label: 'Due', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
    { key: 'paymentStatus', label: 'Status', render: (row) => <StatusPill label={row.paymentStatus || 'due'} tone={row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'partial' ? 'warning' : 'danger'} /> },
    { key: 'actions', label: '', align: 'right', render: rowActions, mobileHidden: true },
  ], [rowActions]);

  const filtersPanel = (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 2.4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(300px, 2fr) repeat(3, minmax(150px, 1fr)) minmax(190px, .9fr)' },
            columnGap: 1.4,
            rowGap: 1.4,
            alignItems: 'start',
            '& .MuiFormHelperText-root': { minHeight: 20, mt: 0.65 },
          }}
        >
          <TextField
            label="Search invoice/customer/vehicle"
            value={filters.searchTerm}
            onChange={(event) => setFilters((current) => ({ ...current, searchTerm: event.target.value }))}
            helperText={filters.searchTerm.length === 1 ? 'Enter one more character.' : 'Search starts after 2 characters.'}
            fullWidth
          />
          <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} helperText="Start date" fullWidth />
          <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} helperText="End date" fullWidth />
          <TextField select label="Payment status" value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} helperText="Filter invoices" fullWidth><MenuItem value="all">All</MenuItem><MenuItem value="due">Due</MenuItem><MenuItem value="partial">Partial</MenuItem><MenuItem value="paid">Paid</MenuItem></TextField>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                minHeight: 56,
                px: 1.2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'background.paper',
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: '100%' }}
                control={<Checkbox checked={filters.gstOnly} onChange={(event) => setFilters((current) => ({ ...current, gstOnly: event.target.checked }))} />}
                label="GST invoices only"
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ minHeight: 20, mt: 0.65, ml: 1.75 }}>
              Show tax invoices only
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const historyTable = (
    <Card>
      <CardContent sx={{ p: { xs: 1.5, md: 2.4 } }}>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No sales found" mobileTitle={(row) => row.invoiceNumber} mobileSubtitle={(row) => `${row.customerName} · ${formatCurrency(row.totalAmount)}`} mobileActions={rowActions} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </CardContent>
    </Card>
  );

  const handleGenerated = useCallback((invoice) => {
    setGeneratedInvoice(invoice);
    setInvoiceReportsRefresh((value) => value + 1);
    setTab(3);
  }, []);

  return <>
    <PageHeader eyebrow="Sales" title="Sales, customer accounts and invoices" description="Record sales with customer site rates, track payments, generate statements, and manage GST/non-GST invoice reports." action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openInvoice}>Record sale</Button>} />
    <Card sx={{ mb: 2.4, overflow: 'hidden' }}>
      <CardContent sx={{ p: 0.65, '&:last-child': { pb: 0.65 } }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-flexContainer': { gap: 0.35 },
            '& .MuiTab-root': { minHeight: 48, borderRadius: 2.5, px: { xs: 1.5, sm: 2.2 }, fontWeight: 750 },
            '& .Mui-selected': { bgcolor: 'rgba(168,79,50,.08)' },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Sales history" />
          <Tab label="Customer report" />
          <Tab label="Invoice reports" />
        </Tabs>
      </CardContent>
    </Card>

    {tab === 0 && <Stack spacing={2.4}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'stretch',
          '& > *': { minWidth: 0 },
        }}
      >
        <SalesSummaryCard label="Today sales" value={formatCurrency(stats.today.salesAmount)} caption={`${formatNumber(stats.today.salesQuantity)} bricks`} />
        <SalesSummaryCard label="This month" value={formatCurrency(stats.month.salesAmount)} caption={`${formatNumber(stats.month.salesCount)} invoices`} />
        <SalesSummaryCard label="Received this month" value={formatCurrency(stats.month.amountReceived)} caption="Cash and other receipts" />
        <SalesSummaryCard label="Total outstanding" value={formatCurrency(stats.all.outstandingAmount)} caption="Across all customer accounts" />
      </Box>
      {filtersPanel}
      {historyTable}
    </Stack>}
    {tab === 1 && <Stack spacing={2.4}>{filtersPanel}{historyTable}</Stack>}
    {tab === 2 && <CustomerReportPanel onInvoiceGenerated={handleGenerated} />}
    {tab === 3 && <InvoiceReportsPanel settings={settings} refreshToken={invoiceReportsRefresh} initialInvoice={generatedInvoice} onInitialInvoiceHandled={() => setGeneratedInvoice(null)} />}

    <Dialog
      open={invoiceOpen}
      onClose={busy ? undefined : () => setInvoiceOpen(false)}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: { xs: 'calc(100dvh - 16px)', sm: 'calc(100dvh - 48px)' },
          m: { xs: 1, sm: 3 },
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box component="form" onSubmit={submitInvoice} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'inherit', height: '100%', overflow: 'hidden' }}>
        <DialogTitle sx={{ pb: 1.5, flexShrink: 0 }}>
          <Typography variant="overline" color="primary.main">SALES ENTRY</Typography>
          <Typography variant="h5">{editingSale ? `Edit ${editingSale.invoiceNumber}` : 'Record brick sale'}</Typography>
          <Typography variant="body2" color="text.secondary">Customer, dispatch, pricing and payment details are grouped for faster entry.</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#F8F5F0', p: { xs: 1.5, sm: 2.4 }, overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0, flex: 1 }}>
          <Stack spacing={2} sx={{ '& .MuiFormHelperText-root': { minHeight: '1.25rem', mx: 0.2 } }}>
            <Card variant="outlined" sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1.6 }}>Invoice and customer</Typography>
                <Grid container spacing={1.6} alignItems="flex-start">
                  <Grid item xs={12} sm={6}>
                    <TextField type="date" label="Sale date" InputLabelProps={{ shrink: true }} value={invoiceForm.date} onChange={(event) => setInvoiceForm((current) => ({ ...current, date: event.target.value }))} helperText="Invoice transaction date" required fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Challan number" value={invoiceForm.challanNumber} onChange={(event) => setInvoiceForm((current) => ({ ...current, challanNumber: event.target.value }))} helperText="Optional delivery challan" fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <AsyncSearchField label="Customer" value={invoiceForm.customer} onChange={selectCustomer} search={customerService.searchCustomers} getOptionLabel={(option) => option?.name || ''} renderOption={(props, option) => <li {...props} key={option.id}><Box><Typography sx={{ fontWeight: 700 }}>{option.name}</Typography><Typography variant="caption" color="text.secondary">{option.phone} · {option.locations?.length || 0} sites</Typography></Box></li>} required helperText="Type at least 2 characters and select the complete customer name." />
                  </Grid>
                  <Grid item xs={12}>
                    <Button size="small" variant="text" sx={{ px: 0, minHeight: 32 }} onClick={() => setQuickCustomerOpen(true)}>Customer not found? Add customer and first site</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1.6 }}>Dispatch and site pricing</Typography>
                <Grid container spacing={1.6} alignItems="flex-start">
                  <Grid item xs={12} sm={6}>
                    <TextField select label="Customer location / site" value={invoiceForm.location?.id || ''} onChange={(event) => selectLocation(event.target.value)} disabled={!invoiceForm.customer} helperText="The saved site rate will be applied automatically." required fullWidth>{(invoiceForm.customer?.locations || []).map((location) => <MenuItem key={location.id} value={location.id}>{location.name}{location.address ? ` — ${location.address}` : ''}</MenuItem>)}</TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete freeSolo options={(settings?.invoice?.vehicles || []).map((vehicle) => vehicle.number || vehicle)} value={invoiceForm.vehicleNumber || ''} onChange={(_, value) => setInvoiceForm((current) => ({ ...current, vehicleNumber: value || '' }))} onInputChange={(_, value) => setInvoiceForm((current) => ({ ...current, vehicleNumber: value || '' }))} renderInput={(params) => <TextField {...params} label="Vehicle number" helperText="Select a Settings vehicle or type another number." fullWidth />} fullWidth />
                  </Grid>
                  {invoiceForm.location && <Grid item xs={12}><Alert severity="info" sx={{ py: 0.5 }}><strong>{invoiceForm.location.name}</strong> · Site rate {formatCurrency(rateForLocation(invoiceForm.customer, invoiceForm.location, invoiceForm.rate))} per brick · {invoiceForm.location.address || 'No site address saved'}</Alert></Grid>}
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1.6 }}>Quantity, rate and tax</Typography>
                <Grid container spacing={1.6} alignItems="flex-start">
                  <Grid item xs={12} sm={4}><TextField label="Brick quantity" type="number" value={invoiceForm.quantity} onChange={(event) => setInvoiceForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 1 }} helperText="Number of bricks sold" required fullWidth /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Rate per brick" type="number" value={invoiceForm.rate} onChange={(event) => setInvoiceForm((current) => ({ ...current, rate: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} helperText="Loaded from selected site" required fullWidth /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Discount" type="number" value={invoiceForm.discount} onChange={(event) => setInvoiceForm((current) => ({ ...current, discount: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} helperText="Optional invoice discount" fullWidth /></Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
                      <FormControlLabel control={<Checkbox checked={invoiceForm.isGst} onChange={(event) => setInvoiceForm((current) => ({ ...current, isGst: event.target.checked, interstate: event.target.checked ? current.interstate : false }))} />} label={`GST invoice (${invoiceForm.interstate ? (gstSettings.igstRate ?? 12) : (Number(gstSettings.cgstRate ?? 6) + Number(gstSettings.sgstRate ?? 6))}%)`} />
                      {invoiceForm.isGst && <FormControlLabel control={<Checkbox checked={invoiceForm.interstate} onChange={(event) => setInvoiceForm((current) => ({ ...current, interstate: event.target.checked }))} />} label="Interstate supply (IGST)" />}
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 1.8, borderRadius: 3, bgcolor: '#F7F2ED', border: '1px solid #E7DED5' }}>
                      <Grid container spacing={1.5} alignItems="stretch">
                        {[['Subtotal', calculated.gross], ['Taxable value', calculated.taxable], ['GST', calculated.gst], ['Invoice total', calculated.total]].map(([label, value], index) => <Grid key={label} item xs={6} sm={3}><Box sx={{ height: '100%', p: 1.2, borderRadius: 2, bgcolor: index === 3 ? 'primary.main' : 'white', color: index === 3 ? 'primary.contrastText' : 'text.primary' }}><Typography variant="caption" sx={{ color: index === 3 ? 'inherit' : 'text.secondary' }}>{label}</Typography><Typography variant="h6" sx={{ color: 'inherit', mt: 0.35, overflowWrap: 'anywhere' }}>{formatCurrency(value)}</Typography></Box></Grid>)}
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.3 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1.6 }}>Payment and notes</Typography>
                <Grid container spacing={1.6} alignItems="flex-start">
                  {editingSale ? <Grid item xs={12}><Alert severity="info">Already received: {formatCurrency(editingSale.paidAmount)}. Existing payments are changed from Record Payment, not while editing the invoice.</Alert></Grid> : <><Grid item xs={12} sm={6}><TextField label="Amount received" type="number" value={invoiceForm.paidAmount} onChange={(event) => setInvoiceForm((current) => ({ ...current, paidAmount: event.target.value }))} inputProps={{ min: 0, max: calculated.total, step: '0.01' }} helperText="Can be zero, partial or full" fullWidth /></Grid><Grid item xs={12} sm={6}><TextField select label="Payment method" value={invoiceForm.paymentMethod} onChange={(event) => setInvoiceForm((current) => ({ ...current, paymentMethod: event.target.value }))} helperText="How this amount was received" fullWidth><MenuItem value="cash">Cash</MenuItem><MenuItem value="digital">Digital / UPI</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="credit">Credit</MenuItem></TextField></Grid></>}
                  <Grid item xs={12}><TextField label="Notes" value={invoiceForm.notes} onChange={(event) => setInvoiceForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} helperText="Optional delivery or payment remarks" fullWidth /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'white', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}><Button onClick={() => setInvoiceOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || !invoiceForm.customer || !invoiceForm.location}>{busy ? 'Saving…' : editingSale ? 'Update invoice' : 'Create invoice'}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={quickCustomerOpen} onClose={busy ? undefined : () => setQuickCustomerOpen(false)} maxWidth="sm" fullWidth><form onSubmit={submitQuickCustomer}><DialogTitle>Add customer and first site</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Customer name" value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} required /><TextField label="Phone" value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} required /><TextField label="Business name" value={customerForm.businessName} onChange={(event) => setCustomerForm((current) => ({ ...current, businessName: event.target.value }))} /><TextField label="Email" type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} /><TextField label="GSTIN" value={customerForm.gstin} onChange={(event) => setCustomerForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} /><TextField label="Site/location name" value={customerForm.siteName} onChange={(event) => setCustomerForm((current) => ({ ...current, siteName: event.target.value }))} required /><TextField label="Site address" value={customerForm.siteAddress} onChange={(event) => setCustomerForm((current) => ({ ...current, siteAddress: event.target.value }))} multiline minRows={2} /><TextField label="Brick rate for this site" type="number" value={customerForm.brickRate} onChange={(event) => setCustomerForm((current) => ({ ...current, brickRate: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} required /></Stack></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setQuickCustomerOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Add and select'}</Button></DialogActions></form></Dialog>

    <Dialog open={Boolean(paymentSale)} onClose={busy ? undefined : () => setPaymentSale(null)} maxWidth="xs" fullWidth><form onSubmit={submitPayment}><DialogTitle>Record payment</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">Pending balance: {formatCurrency(paymentSale?.balanceDue)}</Alert><TextField label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} inputProps={{ min: 0.01, max: paymentSale?.balanceDue, step: '0.01' }} required /><TextField select label="Method" value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}><MenuItem value="cash">Cash</MenuItem><MenuItem value="digital">Digital / UPI</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem></TextField><TextField type="date" label="Payment date" InputLabelProps={{ shrink: true }} value={paymentForm.date} onChange={(event) => setPaymentForm((current) => ({ ...current, date: event.target.value }))} required /><TextField label="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} /></Stack></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setPaymentSale(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</Button></DialogActions></form></Dialog>

    <Dialog open={Boolean(viewerSale)} onClose={busy ? undefined : () => setViewerSale(null)} maxWidth="lg" fullWidth><DialogTitle className="no-print"><Stack direction="row" justifyContent="space-between" alignItems="center"><span>{viewerSale?.invoiceNumber}</span><Stack direction="row" spacing={1}><Button startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>Print</Button><Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={downloadPdf} disabled={busy}>{busy ? 'Preparing…' : 'PDF'}</Button></Stack></Stack></DialogTitle><DialogContent sx={{ p: { xs: 0, sm: 2 }, bgcolor: "#ECE9E4" }}><InvoiceDocument ref={invoiceRef} sale={viewerSale} settings={settings} /></DialogContent><DialogActions className="no-print" sx={{ p: 2.5 }}><Button onClick={() => setViewerSale(null)}>Close</Button></DialogActions></Dialog>

    <ConfirmDialog open={Boolean(deleteSale)} title="Delete this invoice?" description="The sale, customer totals and summary documents will be reversed, and the sold bricks will return to stock." busy={busy} onClose={() => setDeleteSale(null)} onConfirm={confirmDelete} />
  </>;
};

export default SalesPage;
