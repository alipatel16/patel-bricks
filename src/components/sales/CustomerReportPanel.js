import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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


const DEFAULT_COMPANY = {
  name: 'PATEL BRICKS',
  address: 'Behind Patel Petroleum, Mandal Road, Bhojva, Viramgam - 382150',
  phone: '9898032192, 8000001819',
  email: 'patelbricks1819@gmail.com',
  gstin: '24BLLPP8863R1ZX',
};

const reportDate = (value) => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const printMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isClassicIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isIPadDesktopMode = navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1;
  return isClassicIOS || isIPadDesktopMode;
};

const IOS_FIRST_PAGE_ROWS = {
  ledger: 10,
  statement: 16,
};

const IOS_CONTINUATION_ROWS = {
  ledger: 14,
  statement: 22,
};

const buildIOSPrintPages = ({ title, company, customer, period, bodyHtml, summaryHtml = '' }) => {
  const parser = document.createElement('div');
  parser.innerHTML = bodyHtml;
  const table = parser.querySelector('table');
  if (!table) throw new Error('Unable to prepare report table.');

  const headHtml = table.querySelector('thead')?.outerHTML || '';
  const rowHtml = Array.from(table.querySelectorAll('tbody > tr')).map((row) => row.outerHTML);
  const isLedger = /ledger/i.test(title);
  const reportType = isLedger ? 'ledger' : 'statement';
  const firstCapacity = IOS_FIRST_PAGE_ROWS[reportType];
  const continuationCapacity = IOS_CONTINUATION_ROWS[reportType];
  const pages = [];
  let cursor = 0;

  if (!rowHtml.length) {
    pages.push({ first: true, rows: [] });
  } else {
    pages.push({ first: true, rows: rowHtml.slice(0, firstCapacity) });
    cursor = firstCapacity;
    while (cursor < rowHtml.length) {
      pages.push({ first: false, rows: rowHtml.slice(cursor, cursor + continuationCapacity) });
      cursor += continuationCapacity;
    }
  }

  // Keep the ledger summary on a page where it has enough room. This is deliberately
  // conservative for iOS Safari so rows are never clipped at a page boundary.
  if (summaryHtml) {
    const last = pages[pages.length - 1];
    const summarySafeRows = isLedger ? 8 : 15;
    if (last.rows.length > summarySafeRows) {
      pages.push({ first: false, rows: [], summaryOnly: true });
    }
  }

  const companyData = { ...DEFAULT_COMPANY, ...(company || {}) };
  const totalPages = pages.length;

  return pages.map((page, index) => {
    const firstHeader = page.first ? `
      <div class="company">
        <h1>${escapeHtml(companyData.name || 'PATEL BRICKS')}</h1>
        <div class="subtitle">Manufacturer of Fly Ash Bricks</div>
        <div class="meta">${escapeHtml(companyData.address || '')}<br>${companyData.phone ? `Phone: ${escapeHtml(companyData.phone)}` : ''}${companyData.email ? ` &nbsp; • &nbsp; Email: ${escapeHtml(companyData.email)}` : ''}${companyData.gstin ? `<br>GSTIN: ${escapeHtml(companyData.gstin)}` : ''}</div>
        <div class="report-title">${escapeHtml(title)}</div>
      </div>
      <div class="customer-box">
        <div class="row"><span class="label">Customer Name:</span><span class="value">${escapeHtml(customer?.name || '')}</span></div>
        <div class="row"><span class="label">Phone:</span><span class="value">${escapeHtml(customer?.phone || '')}</span></div>
        ${customer?.gstin ? `<div class="row"><span class="label">GSTIN:</span><span class="value">${escapeHtml(customer.gstin)}</span></div>` : '<div></div>'}
        <div class="row"><span class="label">Period:</span><span class="value">${escapeHtml(period)}</span></div>
        <div class="row"><span class="label">Generated On:</span><span class="value">${escapeHtml(new Date().toLocaleDateString('en-GB'))}</span></div>
      </div>` : `
      <div class="continuation-header">
        <strong>${escapeHtml(companyData.name || 'PATEL BRICKS')} · ${escapeHtml(title)}</strong>
        <span>${escapeHtml(customer?.name || '')} · ${escapeHtml(period)}</span>
      </div>`;

    const tableHtml = page.summaryOnly ? '' : `<table>${headHtml}<tbody>${page.rows.join('')}</tbody></table>`;
    const includeSummary = summaryHtml && index === totalPages - 1;

    return `<section class="ios-print-page">
      ${firstHeader}
      ${tableHtml}
      ${includeSummary ? summaryHtml : ''}
      <div class="ios-page-footer">Computer-generated report from Patel Bricks Management. &nbsp; Page ${index + 1} of ${totalPages}</div>
    </section>`;
  }).join('');
};

const openIOSReportPrintWindow = ({ title, company, customer, period, bodyHtml, summaryHtml = '' }) => {
  const popup = window.open('', '_blank');
  if (!popup) {
    toast.error('Could not open the report. Please allow popups for this site.');
    return;
  }

  try {
    const pagesHtml = buildIOSPrintPages({ title, company, customer, period, bodyHtml, summaryHtml });
    popup.document.open();
    popup.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4 portrait; margin: 9mm 8mm 10mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #1d2927; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* iOS Safari reserves part of the physical sheet for its own print header/footer.
               A fixed 210mm x 297mm wrapper therefore overflows by a few millimetres and
               Safari emits a second blank sheet. Keep each logical report page inside the
               @page content box and force page breaks only *before* continuation pages. */
            .ios-print-page { position: relative; width: 100%; height: auto; min-height: 0; padding: 0; overflow: visible; background: #fff; font-size: 10px; page-break-after: auto; break-after: auto; }
            .ios-print-page + .ios-print-page { page-break-before: always; break-before: page; }
            .company { text-align: center; padding: 0 0 9px; border-bottom: 2px solid #173f72; margin-bottom: 10px; }
            .company h1 { margin: 0; color: #173f72; font-size: 21px; letter-spacing: .5px; }
            .company .subtitle { margin-top: 3px; font-weight: 700; font-size: 11px; }
            .company .meta { margin-top: 3px; color: #4f5c59; line-height: 1.35; font-size: 9px; }
            .report-title { margin-top: 6px; font-size: 15px; font-weight: 700; letter-spacing: .04em; }
            .customer-box { border: 1px solid #b7c0bd; padding: 7px 9px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
            .customer-box .row { display: flex; justify-content: space-between; gap: 10px; }
            .customer-box .label { font-weight: 700; color: #465451; }
            .customer-box .value { text-align: right; font-weight: 600; }
            .continuation-header { margin-bottom: 9px; padding: 6px 8px; border: 1px solid #c9cfcd; background: #f5f7f6; display: flex; justify-content: space-between; gap: 10px; font-size: 8.5px; color: #465451; }
            .continuation-header strong { color: #173f72; font-size: 9.5px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th { background: #173f72 !important; color: #fff !important; font-weight: 700; padding: 5px 4px; border: 1px solid #173f72; font-size: 8.5px; }
            td { padding: 5px 4px; border: 1px solid #c9cfcd; vertical-align: top; font-size: 9px; line-height: 1.28; word-break: break-word; }
            .num { text-align: right; white-space: nowrap; }
            .center { text-align: center; }
            .debit { color: #b3261e; font-weight: 700; }
            .credit { color: #237a51; font-weight: 700; }
            .badge { display: inline-block; margin-top: 2px; padding: 1px 4px; border-radius: 3px; font-size: 7px; font-weight: 700; }
            .badge.gst { color: #a12a24; background: #fdeceb; }
            .badge.non-gst { color: #b66b00; background: #fff2df; }
            .badge.payment { color: #237a51; background: #e9f6ef; }
            .total-row td { font-weight: 700; background: #f4f6f5; }
            .summary { margin-top: 10px; padding: 9px 11px; border: 1px solid #c9d8e8; background: #f3f8fd; page-break-inside: avoid; break-inside: avoid; }
            .summary h3 { margin: 0 0 6px; color: #173f72; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; gap: 18px; margin: 4px 0; }
            .ios-page-footer { position: static; margin-top: 10px; padding-top: 5px; border-top: 1px solid #d4d9d7; text-align: center; color: #6c7673; font-size: 7.5px; background: #fff; }
            @media screen { body { background: #e8e8e8; padding: 8px; } .ios-print-page { max-width: 194mm; margin: 0 auto 8px; padding: 9mm 8mm 10mm; box-shadow: 0 1px 8px rgba(0,0,0,.15); } }
            @media print { body { background: #fff; } .ios-print-page { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>${pagesHtml}
          <script>
            window.addEventListener('load', function () {
              window.setTimeout(function () { window.focus(); window.print(); }, 250);
            });
          </script>
        </body>
      </html>`);
    popup.document.close();
  } catch (error) {
    if (!popup.closed) popup.close();
    toast.error(error.message || 'Unable to prepare the report for printing.');
  }
};

const openReportPrintWindow = ({ title, company, customer, period, bodyHtml, summaryHtml = '' }) => {
  if (isIOSDevice()) {
    openIOSReportPrintWindow({ title, company, customer, period, bodyHtml, summaryHtml });
    return;
  }

  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) {
    toast.error('Could not open the print window. Please allow popups for this site.');
    return;
  }
  const companyData = { ...DEFAULT_COMPANY, ...(company || {}) };
  popup.document.write(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1d2927; font-family: Arial, Helvetica, sans-serif; font-size: 11px; background: #fff; }
        .page { width: 100%; }
        .company { text-align: center; padding: 0 0 12px; border-bottom: 2px solid #173f72; margin-bottom: 14px; }
        .company h1 { margin: 0; color: #173f72; font-size: 23px; letter-spacing: .5px; }
        .company .subtitle { margin-top: 4px; font-weight: 700; font-size: 12px; }
        .company .meta { margin-top: 4px; color: #4f5c59; line-height: 1.45; }
        .report-title { margin-top: 8px; font-size: 17px; font-weight: 700; letter-spacing: .04em; }
        .customer-box { border: 1px solid #b7c0bd; padding: 10px 12px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px 22px; }
        .customer-box .row { display: flex; justify-content: space-between; gap: 12px; }
        .customer-box .label { font-weight: 700; color: #465451; }
        .customer-box .value { text-align: right; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th { background: #173f72; color: #fff; font-weight: 700; padding: 7px 6px; border: 1px solid #173f72; font-size: 10px; }
        td { padding: 6px; border: 1px solid #c9cfcd; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .debit { color: #b3261e; font-weight: 700; }
        .credit { color: #237a51; font-weight: 700; }
        .badge { display: inline-block; margin-top: 3px; padding: 2px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; }
        .badge.gst { color: #a12a24; background: #fdeceb; }
        .badge.non-gst { color: #b66b00; background: #fff2df; }
        .badge.payment { color: #237a51; background: #e9f6ef; }
        .total-row td { font-weight: 700; background: #f4f6f5; }
        .summary { margin-top: 14px; padding: 11px 13px; border: 1px solid #c9d8e8; background: #f3f8fd; break-inside: avoid; page-break-inside: avoid; }
        .summary h3 { margin: 0 0 8px; color: #173f72; font-size: 14px; }
        .summary-row { display: flex; justify-content: space-between; gap: 20px; margin: 5px 0; }
        .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d4d9d7; text-align: center; color: #6c7673; font-size: 9px; break-inside: avoid; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="company">
          <h1>${escapeHtml(companyData.name || 'PATEL BRICKS')}</h1>
          <div class="subtitle">Manufacturer of Fly Ash Bricks</div>
          <div class="meta">${escapeHtml(companyData.address || '')}<br>${companyData.phone ? `Phone: ${escapeHtml(companyData.phone)}` : ''}${companyData.email ? ` &nbsp; • &nbsp; Email: ${escapeHtml(companyData.email)}` : ''}${companyData.gstin ? `<br>GSTIN: ${escapeHtml(companyData.gstin)}` : ''}</div>
          <div class="report-title">${escapeHtml(title)}</div>
        </div>
        <div class="customer-box">
          <div class="row"><span class="label">Customer Name:</span><span class="value">${escapeHtml(customer?.name || '')}</span></div>
          <div class="row"><span class="label">Phone:</span><span class="value">${escapeHtml(customer?.phone || '')}</span></div>
          ${customer?.gstin ? `<div class="row"><span class="label">GSTIN:</span><span class="value">${escapeHtml(customer.gstin)}</span></div>` : '<div></div>'}
          <div class="row"><span class="label">Period:</span><span class="value">${escapeHtml(period)}</span></div>
          <div class="row"><span class="label">Generated On:</span><span class="value">${escapeHtml(new Date().toLocaleDateString('en-GB'))}</span></div>
        </div>
        ${bodyHtml}
        ${summaryHtml}
        <div class="footer">Computer-generated report from Patel Bricks Management.</div>
      </div>
      <script>window.onload = function () { window.focus(); window.print(); };</script>
    </body>
  </html>`);
  popup.document.close();
};

const CompanyReportHeader = ({ company, title, customer, period, extra }) => {
  const current = { ...DEFAULT_COMPANY, ...(company || {}) };
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ textAlign: 'center', pb: 1.5, borderBottom: '2px solid #173F72' }}>
        <Typography sx={{ color: '#173F72', fontWeight: 950, fontSize: 24 }}>{current.name}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 12 }}>Manufacturer of Fly Ash Bricks</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>{current.address}</Typography>
        <Typography variant="caption" color="text.secondary">{current.phone ? `Phone: ${current.phone}` : ''}{current.phone && current.email ? ' • ' : ''}{current.email ? `Email: ${current.email}` : ''}</Typography>
        {current.gstin && <Typography variant="caption" sx={{ display: 'block', fontWeight: 800 }}>GSTIN: {current.gstin}</Typography>}
        <Typography sx={{ mt: 1, fontWeight: 900, fontSize: 18, letterSpacing: '.04em' }}>{title}</Typography>
      </Box>
      <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid #C8D0CD', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.6 }}>
        <Typography variant="body2"><strong>Customer Name:</strong> {customer.name}</Typography>
        <Typography variant="body2" sx={{ textAlign: { sm: 'right' } }}><strong>Phone:</strong> {customer.phone}</Typography>
        {customer.gstin && <Typography variant="body2"><strong>GSTIN:</strong> {customer.gstin}</Typography>}
        <Typography variant="body2" sx={{ textAlign: { sm: 'right' } }}><strong>Period:</strong> {period}</Typography>
        {extra && <Typography variant="body2" sx={{ gridColumn: { sm: '1 / -1' } }}>{extra}</Typography>}
      </Box>
    </Box>
  );
};

const LedgerDialog = ({ customer, onClose }) => {
  const [form, setForm] = useState({ dateFrom: '', dateTo: dateKey() });
  const [data, setData] = useState({ rows: [], openingBalance: 0, closingBalance: 0, summary: {} });
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    settingsService.getAll().then((result) => {
      if (active && result.success) setCompany({ ...DEFAULT_COMPANY, ...(result.data.company || {}) });
    });
    return () => { active = false; };
  }, []);

  const load = async () => {
    setBusy(true);
    const result = await customerService.getCustomerLedger({ customerId: customer.id, ...form });
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    setData(result.data);
    return null;
  };

  const period = `${form.dateFrom ? reportDate(form.dateFrom) : 'Beginning'} to ${reportDate(form.dateTo)}`;
  const summary = data.summary || {};

  const printLedger = () => {
    if (!data.rows.length) return;
    const bodyHtml = `<table>
      <thead><tr><th style="width:14%">Date</th><th>Particulars</th><th style="width:16%">Debit (₹)</th><th style="width:16%">Credit (₹)</th><th style="width:17%">Balance (₹)</th></tr></thead>
      <tbody>${data.rows.map((row) => {
        const badgeClass = row.type === 'gst_invoice' ? 'gst' : row.type === 'non_gst_invoice' ? 'non-gst' : 'payment';
        const badgeLabel = row.type === 'gst_invoice' ? 'GST Invoice' : row.type === 'non_gst_invoice' ? 'Non-GST Invoice' : 'Payment';
        return `<tr><td>${escapeHtml(reportDate(row.date))}</td><td>${escapeHtml(row.description)}<br><span class="badge ${badgeClass}">${badgeLabel}</span></td><td class="num debit">${row.debit ? escapeHtml(printMoney(row.debit)) : '-'}</td><td class="num credit">${row.credit ? escapeHtml(printMoney(row.credit)) : '-'}</td><td class="num"><strong>${escapeHtml(printMoney(Math.abs(row.balance)))}</strong> ${row.balance < 0 ? '(Cr)' : '(Dr)'}</td></tr>`;
      }).join('')}</tbody></table>`;
    const summaryHtml = `<div class="summary"><h3>Ledger Summary</h3><div class="summary-row"><strong>Total Invoices:</strong><span class="debit">${escapeHtml(printMoney(summary.totalInvoices))}</span></div><div class="summary-row"><strong>Total Credits:</strong><span class="credit">${escapeHtml(printMoney(summary.totalCredits))}</span></div><div class="summary-row"><strong>Total Transactions:</strong><span>${Number(summary.totalTransactions || 0)}</span></div><hr><div class="summary-row"><strong>Outstanding Balance:</strong><strong>${escapeHtml(printMoney(Math.abs(summary.outstandingBalance || 0)))} ${(summary.outstandingBalance || 0) < 0 ? '(Credit)' : '(Debit)'}</strong></div></div>`;
    openReportPrintWindow({ title: 'CUSTOMER LEDGER STATEMENT', company, customer, period, bodyHtml, summaryHtml });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '94vh' } }}>
      <DialogTitle>Printable ledger · {customer.name}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ py: 1.5 }}>
          <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={form.dateFrom} onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))} fullWidth />
          <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={form.dateTo} onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))} fullWidth />
          <Button variant="contained" onClick={load} disabled={busy} sx={{ minWidth: 150 }}>Generate ledger</Button>
        </Stack>
        <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'white', maxHeight: '62vh', overflowY: 'auto', border: '1px solid #E4E8E6' }}>
          <CompanyReportHeader company={company} title="CUSTOMER LEDGER STATEMENT" customer={customer} period={period} />
          <TableContainer>
            <Table size="small" sx={{ '& th': { bgcolor: '#173F72', color: '#fff', fontWeight: 800 }, '& td, & th': { border: '1px solid #D5DAD8' } }}>
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Particulars</TableCell><TableCell align="right">Debit (₹)</TableCell><TableCell align="right">Credit (₹)</TableCell><TableCell align="right">Balance (₹)</TableCell></TableRow></TableHead>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{reportDate(row.date)}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{row.description}</Typography><Chip size="small" variant="outlined" color={row.type === 'gst_invoice' ? 'error' : row.type === 'non_gst_invoice' ? 'warning' : 'success'} label={row.type === 'gst_invoice' ? 'GST Invoice' : row.type === 'non_gst_invoice' ? 'Non-GST Invoice' : 'Payment'} sx={{ mt: 0.5 }} /></TableCell>
                    <TableCell align="right" sx={{ color: row.debit ? 'error.main' : 'text.secondary', fontWeight: row.debit ? 800 : 400 }}>{row.debit ? formatCurrency(row.debit) : '—'}</TableCell>
                    <TableCell align="right" sx={{ color: row.credit ? 'success.main' : 'text.secondary', fontWeight: row.credit ? 800 : 400 }}>{row.credit ? formatCurrency(row.credit) : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(Math.abs(row.balance))} {row.balance < 0 ? '(Cr)' : '(Dr)'}</TableCell>
                  </TableRow>
                ))}
                {!data.rows.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>Generate the ledger to view Customer Report GST / Non-GST invoices and payments.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          {data.rows.length > 0 && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F3F8FD', border: '1px solid #C9D8E8' }}>
              <Typography sx={{ fontWeight: 900, color: '#173F72', mb: 0.8 }}>Ledger Summary</Typography>
              <Stack spacing={0.55}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Invoices</Typography><Typography variant="body2" color="error.main" sx={{ fontWeight: 800 }}>{formatCurrency(summary.totalInvoices)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Credits</Typography><Typography variant="body2" color="success.main" sx={{ fontWeight: 800 }}>{formatCurrency(summary.totalCredits)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Total Transactions</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{summary.totalTransactions || 0}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.8, mt: 0.4, borderTop: '1px solid #D7E1EB' }}><Typography sx={{ fontWeight: 900 }}>Outstanding Balance</Typography><Typography sx={{ fontWeight: 950 }}>{formatCurrency(Math.abs(summary.outstandingBalance || 0))} {(summary.outstandingBalance || 0) < 0 ? '(Credit)' : '(Debit)'}</Typography></Stack>
              </Stack>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button><Button startIcon={<PrintRoundedIcon />} disabled={!data.rows.length} onClick={printLedger}>Print ledger</Button></DialogActions>
    </Dialog>
  );
};

const StatementDialog = ({ customer, onClose }) => {
  const [form, setForm] = useState({ dateFrom: '', dateTo: dateKey(), location: 'all' });
  const [rows, setRows] = useState([]);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    settingsService.getAll().then((result) => {
      if (active && result.success) setCompany({ ...DEFAULT_COMPANY, ...(result.data.company || {}) });
    });
    return () => { active = false; };
  }, []);

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
  const siteTotals = rows.reduce((result, row) => {
    const key = row.location || 'Unknown Site';
    result[key] = (result[key] || 0) + Number(row.quantity || 0);
    return result;
  }, {});
  const period = `${form.dateFrom ? reportDate(form.dateFrom) : 'Beginning'} to ${reportDate(form.dateTo)}`;
  const selectedSite = form.location === 'all' ? 'All sites' : form.location;

  const printStatement = () => {
    if (!rows.length) return;
    const statementRows = rows.map((row, index) => `<tr><td class="center">${index + 1}</td><td class="center">${escapeHtml(reportDate(row.date))}</td><td class="center">${escapeHtml(row.vehicleNumber || '')}</td><td class="center">${escapeHtml(row.challanNumber || row.id || '')}</td><td class="center">${escapeHtml(row.location || '')}</td><td class="num">${escapeHtml(formatNumber(row.quantity))}</td><td class="num">${escapeHtml(printMoney(row.rate))}</td><td class="num">${escapeHtml(printMoney(row.totalAmount))}</td></tr>`).join('');
    const siteRows = Object.entries(siteTotals).length > 1 ? Object.entries(siteTotals).map(([site, quantity]) => `<tr class="total-row"><td></td><td></td><td></td><td class="center">${escapeHtml(site)}</td><td></td><td class="num">${escapeHtml(formatNumber(quantity))}</td><td></td><td></td></tr>`).join('') : '';
    const bodyHtml = `<table><thead><tr><th>SR NO</th><th>DATE</th><th>VEHICLE NO</th><th>DOC NO</th><th>SITE NAME</th><th>QUANTITY</th><th>RATE</th><th>AMOUNT</th></tr></thead><tbody>${statementRows}<tr class="total-row"><td></td><td></td><td></td><td class="center">TOTAL</td><td></td><td class="num">${escapeHtml(formatNumber(totalQuantity))}</td><td></td><td class="num">${escapeHtml(printMoney(totalAmount))}</td></tr>${siteRows}</tbody></table>`;
    openReportPrintWindow({ title: 'CUSTOMER STATEMENT', company, customer, period: `${period} · ${selectedSite}`, bodyHtml });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '94vh' } }}>
      <DialogTitle>Customer statement · {customer.name}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ py: 1.5 }}>
          <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={form.dateFrom} onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))} fullWidth />
          <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={form.dateTo} onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))} fullWidth />
          <TextField select label="Site" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} fullWidth><MenuItem value="all">All sites</MenuItem>{(customer.locations || []).map((location) => <MenuItem key={location.id} value={location.name}>{location.name}</MenuItem>)}</TextField>
          <Button variant="contained" onClick={load} disabled={busy} sx={{ minWidth: 125 }}>Generate</Button>
        </Stack>
        <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'white', maxHeight: '62vh', overflowY: 'auto', border: '1px solid #E4E8E6' }}>
          <CompanyReportHeader company={company} title="CUSTOMER STATEMENT" customer={customer} period={period} extra={`Site: ${selectedSite}`} />
          <TableContainer>
            <Table size="small" sx={{ '& th': { bgcolor: '#173F72', color: '#fff', fontWeight: 800, textAlign: 'center' }, '& td, & th': { border: '1px solid #D5DAD8' } }}>
              <TableHead><TableRow><TableCell>SR NO</TableCell><TableCell>DATE</TableCell><TableCell>VEHICLE NO</TableCell><TableCell>DOC NO</TableCell><TableCell>SITE NAME</TableCell><TableCell align="right">QUANTITY</TableCell><TableCell align="right">RATE</TableCell><TableCell align="right">AMOUNT</TableCell></TableRow></TableHead>
              <TableBody>
                {rows.map((row, index) => <TableRow key={row.id}><TableCell align="center">{index + 1}</TableCell><TableCell align="center">{reportDate(row.date)}</TableCell><TableCell align="center">{row.vehicleNumber || ''}</TableCell><TableCell align="center">{row.challanNumber || row.id || ''}</TableCell><TableCell align="center">{row.location || ''}</TableCell><TableCell align="right">{formatNumber(row.quantity)}</TableCell><TableCell align="right">{formatCurrency(row.rate)}</TableCell><TableCell align="right">{formatCurrency(row.totalAmount)}</TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>Generate the statement to view sales.</TableCell></TableRow>}
                {rows.length > 0 && <TableRow sx={{ bgcolor: '#F4F6F5' }}><TableCell /><TableCell /><TableCell /><TableCell align="center" sx={{ fontWeight: 900 }}>TOTAL</TableCell><TableCell /><TableCell align="right" sx={{ fontWeight: 900 }}>{formatNumber(totalQuantity)}</TableCell><TableCell /><TableCell align="right" sx={{ fontWeight: 900 }}>{formatCurrency(totalAmount)}</TableCell></TableRow>}
                {rows.length > 0 && Object.entries(siteTotals).length > 1 && Object.entries(siteTotals).map(([site, quantity]) => <TableRow key={site} sx={{ bgcolor: '#FAFAF8' }}><TableCell /><TableCell /><TableCell /><TableCell align="center" sx={{ fontWeight: 800 }}>{site}</TableCell><TableCell /><TableCell align="right" sx={{ fontWeight: 800 }}>{formatNumber(quantity)}</TableCell><TableCell /><TableCell /></TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button><Button startIcon={<PrintRoundedIcon />} disabled={!rows.length} onClick={printStatement}>Print statement</Button></DialogActions>
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
