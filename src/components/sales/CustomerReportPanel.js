import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import toast from 'react-hot-toast';
import CursorPagination from '../common/CursorPagination';
import ResponsiveRecordTable from '../data/ResponsiveRecordTable';
import { useCursorPager } from '../../hooks/useCursorPager';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { customerService } from '../../services/customerService';
import { invoiceReportService } from '../../services/invoiceReportService';
import { settingsService } from '../../services/settingsService';
import { dateKey, formatCurrency, formatNumber } from '../../services/queryUtils';

const AccountDialog = ({ customer, onClose, onPayment }) => {
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
    { key: 'quantity', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.quantity) },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
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
    { key: 'totalBricks', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.totalBricks) },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
  ];
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><span>{customer.name} · Customer account</span><Button startIcon={<AccountBalanceWalletRoundedIcon />} variant="contained" onClick={onPayment} disabled={Number(customer.balanceDue || 0) <= 0}>Payment entry</Button></Stack></DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, mb: 2, bgcolor: '#FAF8F4', borderRadius: 2 }}>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Purchases</Typography><Typography variant="h6">{customer.totalPurchases || 0}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Invoiced</Typography><Typography variant="h6">{formatCurrency(customer.totalAmount)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Paid</Typography><Typography variant="h6">{formatCurrency(customer.totalPaid)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Balance</Typography><Typography variant="h6" color="warning.main">{formatCurrency(customer.balanceDue)}</Typography></Box>
        </Stack>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}><Tab value="sales" label="Sales" /><Tab value="payments" label="Payments" /><Tab value="invoices" label="Generated invoices" /></Tabs>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No records" mobileTitle={(row) => row.invoiceNumber || row.gstInvoiceNumber || row.date} mobileSubtitle={(row) => `${row.date} · ${formatCurrency(row.totalAmount || row.amount)}`} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};


const LedgerDialog = ({ customer, onClose }) => {
  const [form, setForm] = useState({ dateFrom: '', dateTo: dateKey() });
  const [data, setData] = useState({ rows: [], openingBalance: 0, closingBalance: 0 });
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    const result = await customerService.getCustomerLedger({ customerId: customer.id, ...form });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setData(result.data);
    return null;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Printable ledger · {customer.name}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ py: 1.5 }}><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={form.dateFrom} onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))} fullWidth /><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={form.dateTo} onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))} fullWidth /><Button variant="contained" onClick={load} disabled={busy}>Generate ledger</Button></Stack>
        <Box className="invoice-print-area" sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}><Box><Typography variant="h5">Customer Ledger</Typography><Typography>{customer.name} · {customer.phone}</Typography></Box><Typography variant="body2">{form.dateFrom || 'Beginning'} to {form.dateTo}</Typography></Stack>
          {form.dateFrom && <Typography variant="body2" sx={{ mb: 1 }}><strong>Opening balance:</strong> {formatCurrency(data.openingBalance)}</Typography>}
          <ResponsiveRecordTable rows={data.rows} columns={[
            { key: 'date', label: 'Date' },
            { key: 'reference', label: 'Reference' },
            { key: 'description', label: 'Description' },
            { key: 'debit', label: 'Debit', align: 'right', render: (row) => row.debit ? formatCurrency(row.debit) : '—' },
            { key: 'credit', label: 'Credit', align: 'right', render: (row) => row.credit ? formatCurrency(row.credit) : '—' },
            { key: 'balance', label: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
          ]} emptyTitle="Generate the ledger to view entries" mobileTitle={(row) => row.reference} mobileSubtitle={(row) => `${row.date} · Balance ${formatCurrency(row.balance)}`} />
          {data.rows.length > 0 && <Typography variant="h6" sx={{ textAlign: 'right', mt: 2 }}>Closing balance: {formatCurrency(data.closingBalance)}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button><Button startIcon={<PrintRoundedIcon />} disabled={!data.rows.length} onClick={() => window.print()}>Print ledger</Button></DialogActions>
    </Dialog>
  );
};

const StatementDialog = ({ customer, onClose }) => {
  const [form, setForm] = useState({ dateFrom: '', dateTo: dateKey(), location: 'all' });
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const statementRef = useRef(null);
  const load = async () => {
    setBusy(true);
    const result = await customerService.getCustomerSalesForStatement({ customerId: customer.id, ...form });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setRows(result.data);
    return null;
  };
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const totalDue = rows.reduce((sum, row) => sum + Number(row.balanceDue || 0), 0);
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Customer statement · {customer.name}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ py: 1.5 }}><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={form.dateFrom} onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))} fullWidth /><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={form.dateTo} onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))} fullWidth /><TextField select label="Site" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} fullWidth><MenuItem value="all">All sites</MenuItem>{(customer.locations || []).map((location) => <MenuItem key={location.id} value={location.name}>{location.name}</MenuItem>)}</TextField><Button variant="contained" onClick={load} disabled={busy}>Generate</Button></Stack>
        <Box ref={statementRef} className="invoice-print-area" sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'white' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}><Box><Typography variant="h5">Customer Statement</Typography><Typography>{customer.name} · {customer.phone}</Typography></Box><Typography variant="body2">{form.dateFrom || 'Beginning'} to {form.dateTo}</Typography></Stack>
          <ResponsiveRecordTable rows={rows} columns={[
            { key: 'date', label: 'Date' },
            { key: 'invoiceNumber', label: 'Invoice' },
            { key: 'location', label: 'Site' },
            { key: 'quantity', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.quantity) },
            { key: 'rate', label: 'Rate', align: 'right', render: (row) => formatCurrency(row.rate) },
            { key: 'totalAmount', label: 'Amount', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
            { key: 'balanceDue', label: 'Due', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
          ]} emptyTitle="Generate the statement to view sales" mobileTitle={(row) => row.invoiceNumber} mobileSubtitle={(row) => `${row.date} · ${formatCurrency(row.totalAmount)}`} />
          {rows.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={3} sx={{ mt: 2 }}><Typography><strong>Bricks:</strong> {formatNumber(totalQuantity)}</Typography><Typography><strong>Amount:</strong> {formatCurrency(totalAmount)}</Typography><Typography><strong>Due:</strong> {formatCurrency(totalDue)}</Typography></Stack>}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button><Button startIcon={<PrintRoundedIcon />} disabled={!rows.length} onClick={() => window.print()}>Print statement</Button></DialogActions>
    </Dialog>
  );
};

const GenerateInvoiceDialog = ({ customer, onClose, onGenerated }) => {
  const primary = customer.locations?.find((location) => location.isPrimary) || customer.locations?.[0];
  const siteRate = (location) => Number(customer.brickRates?.[location?.id] ?? location?.brickRate ?? 0);
  const [form, setForm] = useState({
    invoiceDate: dateKey(),
    dateFrom: '',
    dateTo: dateKey(),
    selectedSite: primary?.name || 'all',
    rate: primary ? siteRate(primary) || '' : '',
    gstBricks: '',
    nonGstBricks: '',
    notes: '',
  });
  const [eligible, setEligible] = useState(null);
  const [disableNonGst, setDisableNonGst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gstNumbering, setGstNumbering] = useState(null);

  useEffect(() => {
    let active = true;
    settingsService.getAll().then((result) => {
      if (!active || !result.success) return;
      const invoice = result.data.invoice || {};
      setGstNumbering({
        prefix: String(invoice.gstInvoicePrefix || 'C').trim().toUpperCase(),
        currentNumber: Math.max(1, Math.trunc(Number(invoice.gstInvoiceCurrentNumber) || 1)),
        autoIncrement: invoice.gstInvoiceAutoIncrement !== false,
      });
    });
    return () => { active = false; };
  }, []);

  const validationError = () => {
    if (!form.invoiceDate) return 'Invoice date is required.';
    if (!form.dateFrom) return 'From sales date is required.';
    if (!form.dateTo) return 'To sales date is required.';
    if (form.dateFrom > form.dateTo) return 'From sales date must be before or equal to the to date.';
    if (!form.selectedSite) return 'Select a customer site.';
    return '';
  };

  const preview = async () => {
    const error = validationError();
    if (error) return toast.error(error);
    setBusy(true);
    const result = await invoiceReportService.getEligibleSales({
      customerId: customer.id,
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      location: form.selectedSite,
    });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setEligible(result.data);
    setForm((current) => {
      const currentTotal = Number(current.gstBricks || 0) + Number(current.nonGstBricks || 0);
      const selectedLocation = customer.locations?.find((location) => location.name === current.selectedSite);
      const configuredRate = selectedLocation ? siteRate(selectedLocation) : 0;
      return {
        ...current,
        rate: configuredRate || result.data.averageRate || current.rate,
        gstBricks: currentTotal > 0 ? current.gstBricks : (disableNonGst ? result.data.totalBricks : 0),
        nonGstBricks: currentTotal > 0 ? current.nonGstBricks : (disableNonGst ? 0 : result.data.totalBricks),
      };
    });
    if (!result.data.totalBricks) toast.error('No eligible sales were found for this customer, site and date range.');
    return null;
  };

  const handleBrickQuantity = (field, rawValue) => {
    if (disableNonGst && field === 'nonGstBricks') return;
    if (rawValue === '') {
      setForm((current) => ({
        ...current,
        [field]: '',
        ...(disableNonGst ? {} : { [field === 'gstBricks' ? 'nonGstBricks' : 'gstBricks']: '' }),
      }));
      return;
    }
    const parsed = Math.max(0, Math.trunc(Number(rawValue) || 0));
    const maximum = Number(eligible?.totalBricks || 0);
    const quantity = maximum > 0 ? Math.min(parsed, maximum) : parsed;
    if (disableNonGst) {
      setForm((current) => ({ ...current, gstBricks: quantity, nonGstBricks: 0 }));
      return;
    }
    const otherField = field === 'gstBricks' ? 'nonGstBricks' : 'gstBricks';
    setForm((current) => ({
      ...current,
      [field]: quantity,
      [otherField]: maximum > 0 ? Math.max(0, maximum - quantity) : current[otherField],
    }));
  };

  const generate = async () => {
    const error = validationError();
    if (error) return toast.error(error);
    if (!eligible) return toast.error('Check eligible sales before generating the invoice.');
    const gstBricks = Number(form.gstBricks || 0);
    const nonGstBricks = Number(form.nonGstBricks || 0);
    const total = gstBricks + nonGstBricks;
    if (!Number(form.rate || 0)) return toast.error('Enter a valid brick rate.');
    if (!total) return toast.error('Enter GST or non-GST brick quantity.');
    if (total > eligible.totalBricks) return toast.error(`Invoice quantity cannot exceed ${formatNumber(eligible.totalBricks)} eligible bricks.`);
    setBusy(true);
    const result = await invoiceReportService.generateInvoice({ customer, ...form, gstBricks, nonGstBricks });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(gstBricks > 0 ? `GST invoice ${result.data.gstInvoiceNumber} generated.` : 'Non-GST invoice generated without consuming a GST number.');
    onGenerated?.(result.data);
    onClose();
    return null;
  };

  const handleSite = (siteName) => {
    const location = customer.locations?.find((item) => item.name === siteName);
    setForm((current) => ({
      ...current,
      selectedSite: siteName,
      rate: location ? siteRate(location) || current.rate : '',
      gstBricks: '',
      nonGstBricks: '',
    }));
    setEligible(null);
  };

  const totalAllocated = Number(form.gstBricks || 0) + Number(form.nonGstBricks || 0);
  const remaining = Math.max(0, Number(eligible?.totalBricks || 0) - totalAllocated);
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate GST / non-GST invoice · {customer.name}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="info">{gstNumbering ? <>Next GST invoice: <strong>{gstNumbering.prefix}-{gstNumbering.currentNumber}</strong>. {gstNumbering.autoIncrement ? 'It increments only after a GST invoice is saved.' : 'Auto-increment is disabled in Settings.'}</> : 'GST numbering is loaded from Settings.'} A non-GST-only invoice has no GST invoice number and does not consume the counter.</Alert>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField required type="date" label="Invoice date" InputLabelProps={{ shrink: true }} value={form.invoiceDate} onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))} fullWidth />
          <TextField required type="date" label="From sales date" InputLabelProps={{ shrink: true }} value={form.dateFrom} onChange={(event) => { setForm((current) => ({ ...current, dateFrom: event.target.value, gstBricks: '', nonGstBricks: '' })); setEligible(null); }} fullWidth />
          <TextField required type="date" label="To sales date" InputLabelProps={{ shrink: true }} value={form.dateTo} onChange={(event) => { setForm((current) => ({ ...current, dateTo: event.target.value, gstBricks: '', nonGstBricks: '' })); setEligible(null); }} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField required select label="Site" value={form.selectedSite} onChange={(event) => handleSite(event.target.value)} fullWidth><MenuItem value="all">All sites</MenuItem>{(customer.locations || []).map((location) => <MenuItem key={location.id} value={location.name}>{location.name}{siteRate(location) ? ` · ${formatCurrency(siteRate(location))}/brick` : ''}</MenuItem>)}</TextField>
          <TextField required label="Invoice rate" type="number" value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} helperText={form.selectedSite === 'all' ? 'Uses weighted average after eligible sales are checked.' : 'Loaded from this customer site.'} fullWidth />
          <Button variant="outlined" onClick={preview} disabled={busy} sx={{ minWidth: 180 }}>{busy ? 'Checking…' : 'Check eligible sales'}</Button>
        </Stack>
        {eligible && <Alert severity={eligible.totalBricks > 0 ? 'success' : 'warning'}>Eligible sales: {eligible.sales.length} · {formatNumber(eligible.totalBricks)} bricks · {formatCurrency(eligible.totalAmount)}{eligible.averageRate > 0 ? ` · weighted rate ${formatCurrency(eligible.averageRate)}` : ''}</Alert>}
        <FormControlLabel control={<Switch checked={disableNonGst} onChange={(event) => { const checked = event.target.checked; setDisableNonGst(checked); setForm((current) => ({ ...current, nonGstBricks: checked ? 0 : current.nonGstBricks, gstBricks: checked && eligible && !Number(current.gstBricks || 0) ? eligible.totalBricks : current.gstBricks })); }} />} label="GST-only invoice — disable non-GST allocation" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField label="GST invoice bricks" type="number" value={form.gstBricks} onChange={(event) => handleBrickQuantity('gstBricks', event.target.value)} inputProps={{ min: 0, max: eligible?.totalBricks }} helperText="A GST number is assigned only when this is greater than zero." fullWidth />
          <TextField label="Non-GST invoice bricks" type="number" value={form.nonGstBricks} onChange={(event) => handleBrickQuantity('nonGstBricks', event.target.value)} inputProps={{ min: 0, max: eligible?.totalBricks }} disabled={disableNonGst} helperText="No invoice number is assigned to the non-GST component." fullWidth />
        </Stack>
        {eligible && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><Typography variant="body2"><strong>Allocated:</strong> {formatNumber(totalAllocated)}</Typography><Typography variant="body2"><strong>Remaining:</strong> {formatNumber(remaining)}</Typography></Stack>}
        <TextField label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} />
      </Stack></DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={generate} disabled={busy || !eligible || eligible.totalBricks <= 0}>{busy ? 'Generating…' : 'Generate invoice'}</Button></DialogActions>
    </Dialog>
  );
};

const CustomerReportPanel = ({ onInvoiceGenerated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debounced = useDebouncedValue(searchTerm, 350);
  const effectiveSearch = debounced.trim().length >= 2 ? debounced.trim() : '';
  const [accountCustomer, setAccountCustomer] = useState(null);
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', date: dateKey(), notes: '' });
  const [paymentBusy, setPaymentBusy] = useState(false);
  const loader = useCallback(({ cursor, pageSize }) => customerService.getCustomersPage({ cursor, pageSize, searchTerm: effectiveSearch, status: 'active' }), [effectiveSearch]);
  const pager = useCursorPager({ loader, dependencies: [effectiveSearch], pageSize: 10 });

  const actions = useCallback((customer) => <Stack direction="row" spacing={0.2}>
    <Tooltip title="Statement"><IconButton onClick={() => setStatementCustomer(customer)}><DescriptionRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Printable ledger"><IconButton onClick={() => setLedgerCustomer(customer)}><HistoryEduRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Generate GST / non-GST invoice"><IconButton color="primary" onClick={() => setInvoiceCustomer(customer)}><ReceiptLongRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Payment entry"><IconButton color="success" onClick={() => { setPaymentCustomer(customer); setPaymentForm({ amount: customer.balanceDue || '', method: 'cash', date: dateKey(), notes: '' }); }}><AccountBalanceWalletRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Account and ledger"><IconButton color="success" onClick={() => setAccountCustomer(customer)}><MenuBookRoundedIcon fontSize="small" /></IconButton></Tooltip>
  </Stack>, []);

  const columns = useMemo(() => [
    { key: 'name', label: 'Customer', render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.phone}</Typography></Box> },
    { key: 'totalPurchases', label: 'Purchases', align: 'right' },
    { key: 'locations', label: 'Sites', render: (row) => `${row.locations?.length || 0} sites` },
    { key: 'totalAmount', label: 'Invoiced', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'totalPaid', label: 'Paid', align: 'right', render: (row) => formatCurrency(row.totalPaid) },
    { key: 'balanceDue', label: 'Due', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
    { key: 'actions', label: '', align: 'right', render: actions, mobileHidden: true },
  ], [actions]);

  const submitPayment = async (event) => {
    event.preventDefault();
    setPaymentBusy(true);
    const result = await customerService.recordCustomerPayment({ customerId: paymentCustomer.id, ...paymentForm });
    setPaymentBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Customer payment recorded.');
    setPaymentCustomer(null);
    setAccountCustomer(null);
    pager.refresh();
    return null;
  };

  return <>
    <Card><CardContent sx={{ p: { xs: 1.8, md: 2.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2} sx={{ mb: 2.2 }}><Box sx={{ pt: 0.35 }}><Typography variant="h6">Customer report</Typography><Typography variant="body2" color="text.secondary">Statements, customer ledgers and consolidated GST/non-GST invoices.</Typography></Box><TextField label="Search customer" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} helperText={searchTerm.length === 1 ? 'Enter one more character.' : 'Search starts after 2 characters.'} sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }} /></Stack>
      {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
      <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No customers found" mobileTitle={(row) => row.name} mobileSubtitle={(row) => `${formatCurrency(row.balanceDue)} due`} mobileActions={actions} />
      <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
    </CardContent></Card>
    {accountCustomer && <AccountDialog customer={accountCustomer} onClose={() => setAccountCustomer(null)} onPayment={() => { setPaymentCustomer(accountCustomer); setPaymentForm({ amount: accountCustomer.balanceDue || '', method: 'cash', date: dateKey(), notes: '' }); }} />}
    {statementCustomer && <StatementDialog customer={statementCustomer} onClose={() => setStatementCustomer(null)} />}
    {ledgerCustomer && <LedgerDialog customer={ledgerCustomer} onClose={() => setLedgerCustomer(null)} />}
    {invoiceCustomer && <GenerateInvoiceDialog customer={invoiceCustomer} onClose={() => setInvoiceCustomer(null)} onGenerated={onInvoiceGenerated} />}
    <Dialog open={Boolean(paymentCustomer)} onClose={paymentBusy ? undefined : () => setPaymentCustomer(null)} maxWidth="xs" fullWidth><form onSubmit={submitPayment}><DialogTitle>Payment entry · {paymentCustomer?.name}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">Customer balance: {formatCurrency(paymentCustomer?.balanceDue)}</Alert><TextField label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} inputProps={{ min: 0.01, max: paymentCustomer?.balanceDue, step: '0.01' }} required /><TextField select label="Method" value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}><MenuItem value="cash">Cash</MenuItem><MenuItem value="digital">Digital / UPI</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem></TextField><TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={paymentForm.date} onChange={(event) => setPaymentForm((current) => ({ ...current, date: event.target.value }))} required /><TextField label="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setPaymentCustomer(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={paymentBusy}>{paymentBusy ? 'Saving…' : 'Record payment'}</Button></DialogActions></form></Dialog>
  </>;
};

export default CustomerReportPanel;
