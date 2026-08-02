import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import StatusPill from '../components/data/StatusPill';
import { gstReportService } from '../services/gstReportService';
import { settingsService } from '../services/settingsService';
import { dateKey, formatCurrency, formatNumber } from '../services/queryUtils';

const firstDayOfCurrentMonth = () => `${dateKey().slice(0, 7)}-01`;
const reportTypes = [
  { value: 'GSTR3B', label: 'GSTR-3B · Monthly summary' },
  { value: 'GSTR1', label: 'GSTR-1 · Outward supplies' },
  { value: 'GSTR2', label: 'GSTR-2 · Inward supplies' },
  { value: 'GSTR9', label: 'GSTR-9 · Annual return' },
];

const emptyReport = {
  outward: [],
  inward: [],
  summary: {
    outward: { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0, bricks: 0 },
    inward: { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0 },
    netGstLiability: 0,
  },
  reads: 0,
};

const GstReportsPage = () => {
  const [filters, setFilters] = useState({
    reportType: 'GSTR3B',
    fromDate: firstDayOfCurrentMonth(),
    toDate: dateKey(),
  });
  const [settings, setSettings] = useState(null);
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [loadedRange, setLoadedRange] = useState(null);

  const loadReport = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    const settingsResult = settings || await settingsService.getAll();
    if (!settings && settingsResult?.success) setSettings(settingsResult.data);
    const resolvedSettings = settingsResult?.success ? settingsResult.data : settingsResult;
    const invoiceSettings = resolvedSettings?.invoice || {};
    const companySettings = resolvedSettings?.company || {};
    const result = await gstReportService.getReport({
      fromDate: nextFilters.fromDate,
      toDate: nextFilters.toDate,
      settings: {
        ...invoiceSettings,
        companyStateCode: companySettings.stateCode,
      },
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setReport(result.data);
    setLoadedRange({ fromDate: nextFilters.fromDate, toDate: nextFilters.toDate });
  }, [filters, settings]);

  useEffect(() => {
    loadReport();
    // The current month is intentionally loaded once. Date field edits do not
    // trigger Firestore reads until Generate report is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outwardColumns = useMemo(() => [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'invoiceNumber', label: 'GST invoice', nowrap: true, render: (row) => <Typography sx={{ fontWeight: 800 }}>{row.invoiceNumber}</Typography> },
    { key: 'customerName', label: 'Customer', render: (row) => <Box><Typography sx={{ fontWeight: 700 }}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary">{row.selectedSite}</Typography></Box> },
    { key: 'customerGstin', label: 'GSTIN', render: (row) => <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{row.customerGstin}</Typography> },
    { key: 'bricks', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.bricks) },
    { key: 'rate', label: 'Rate', align: 'right', render: (row) => formatCurrency(row.rate) },
    { key: 'taxableValue', label: 'Taxable', align: 'right', render: (row) => formatCurrency(row.taxableValue) },
    { key: 'cgstAmount', label: 'CGST', align: 'right', render: (row) => formatCurrency(row.cgstAmount) },
    { key: 'sgstAmount', label: 'SGST', align: 'right', render: (row) => formatCurrency(row.sgstAmount) },
    { key: 'igstAmount', label: 'IGST', align: 'right', render: (row) => formatCurrency(row.igstAmount) },
    { key: 'totalValue', label: 'Invoice value', align: 'right', render: (row) => <Typography sx={{ fontWeight: 800 }}>{formatCurrency(row.totalValue)}</Typography> },
  ], []);

  const inwardColumns = useMemo(() => [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'billNumber', label: 'Bill number', nowrap: true },
    { key: 'supplierName', label: 'Supplier', render: (row) => <Box><Typography sx={{ fontWeight: 700 }}>{row.supplierName}</Typography><Typography variant="caption" color="text.secondary">{String(row.material || '').replaceAll('_', ' ')}</Typography></Box> },
    { key: 'supplierGstin', label: 'GSTIN', render: (row) => <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{row.supplierGstin}</Typography> },
    { key: 'taxableValue', label: 'Taxable', align: 'right', render: (row) => formatCurrency(row.taxableValue) },
    { key: 'cgstAmount', label: 'CGST', align: 'right', render: (row) => formatCurrency(row.cgstAmount) },
    { key: 'sgstAmount', label: 'SGST', align: 'right', render: (row) => formatCurrency(row.sgstAmount) },
    { key: 'igstAmount', label: 'IGST', align: 'right', render: (row) => formatCurrency(row.igstAmount) },
    { key: 'totalValue', label: 'Bill value', align: 'right', render: (row) => <Typography sx={{ fontWeight: 800 }}>{formatCurrency(row.totalValue)}</Typography> },
    { key: 'supplyType', label: 'Type', render: (row) => <StatusPill label={row.supplyType} tone={row.gstAmount > 0 ? 'success' : 'neutral'} /> },
  ], []);

  const exportWorkbook = () => {
    if (!report.outward.length && !report.inward.length) {
      toast.error('No GST data is available for the selected period.');
      return;
    }
    const workbook = XLSX.utils.book_new();
    const period = `${loadedRange?.fromDate || filters.fromDate} to ${loadedRange?.toDate || filters.toDate}`;

    const summaryRows = [
      ['GSTR-3B Summary'],
      ['Period', period],
      [],
      ['Description', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST', 'Total Value'],
      ['Outward supplies', report.summary.outward.taxable, report.summary.outward.cgst, report.summary.outward.sgst, report.summary.outward.igst, report.summary.outward.gst, report.summary.outward.total],
      ['Inward supplies', report.summary.inward.taxable, report.summary.inward.cgst, report.summary.inward.sgst, report.summary.inward.igst, report.summary.inward.gst, report.summary.inward.total],
      [],
      ['Net GST liability', report.summary.netGstLiability],
      ['Liability status', report.summary.netGstLiability >= 0 ? 'Payable' : 'Refundable'],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'GSTR-3B Summary');

    if (report.outward.length) {
      const outwardRows = report.outward.map((item) => ({
        Date: item.date,
        'GST Invoice No.': item.invoiceNumber,
        Customer: item.customerName,
        GSTIN: item.customerGstin,
        Site: item.selectedSite,
        Bricks: item.bricks,
        'Rate per Brick': item.rate,
        'Taxable Value': item.taxableValue,
        CGST: item.cgstAmount,
        SGST: item.sgstAmount,
        IGST: item.igstAmount,
        'Total GST': item.gstAmount,
        'Invoice Value': item.totalValue,
      }));
      const sheet = XLSX.utils.json_to_sheet(outwardRows);
      sheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(workbook, sheet, 'GSTR-1 Outward');
    }

    if (report.inward.length) {
      const inwardRows = report.inward.map((item) => ({
        Date: item.date,
        'Bill No.': item.billNumber,
        Supplier: item.supplierName,
        GSTIN: item.supplierGstin,
        Material: item.material,
        Quantity: item.quantity,
        Unit: item.unit,
        'Taxable Value': item.taxableValue,
        CGST: item.cgstAmount,
        SGST: item.sgstAmount,
        IGST: item.igstAmount,
        'Total GST': item.gstAmount,
        'Bill Value': item.totalValue,
      }));
      const sheet = XLSX.utils.json_to_sheet(inwardRows);
      sheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(workbook, sheet, 'GSTR-2 Inward');
    }

    XLSX.writeFile(workbook, `Patel-Bricks-GST-${period.replaceAll(' ', '_')}.xlsx`);
    toast.success('GST Excel report downloaded.');
  };

  const summary = report.summary;
  const reportType = filters.reportType;
  const showOutward = reportType === 'GSTR1' || reportType === 'GSTR3B';
  const showInward = reportType === 'GSTR2' || reportType === 'GSTR3B';

  return (
    <>
      <PageHeader
        eyebrow="GST compliance"
        title="GST reports and return summary"
        description="Review generated GST invoices as outward supplies, purchase bills as inward supplies, and export GSTR-ready Excel workbooks."
        action={<Button variant="contained" startIcon={<FileDownloadRoundedIcon />} onClick={exportWorkbook} disabled={loading}>Export Excel</Button>}
      />

      <Alert severity="info" sx={{ mb: 2.4, alignItems: 'center' }}>
        <strong>Outward supplies</strong> come from GST invoices generated in Sales → Customer report. <strong>Inward supplies</strong> come from recorded material and supplier purchases. Editing the dates does not read Firestore until you press Generate report.
      </Alert>

      <Card sx={{ mb: 2.4 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: '1.35fr 1fr 1fr .9fr 1fr' },
              gap: 1.6,
              alignItems: 'stretch',
              '& .MuiTextField-root': { height: '100%' },
            }}
          >
            <TextField select label="Report type" value={filters.reportType} onChange={(event) => setFilters((current) => ({ ...current, reportType: event.target.value }))} fullWidth>
              {reportTypes.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
            </TextField>
            <TextField type="date" label="From date" InputLabelProps={{ shrink: true }} value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} fullWidth />
            <TextField type="date" label="To date" InputLabelProps={{ shrink: true }} value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} fullWidth />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={17} color="inherit" /> : <DownloadRoundedIcon />}
              onClick={() => loadReport(filters)}
              disabled={loading}
              fullWidth
              sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
            >
              {loading ? 'Loading…' : 'Generate report'}
            </Button>
            <Box
              sx={{
                minHeight: 56,
                px: 1.6,
                py: 0.75,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              <Typography variant="caption" color="text.secondary">Loaded period</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loadedRange ? `${loadedRange.fromDate} → ${loadedRange.toDate}` : 'Not loaded'}</Typography>
              <Typography variant="caption" color="text.secondary">{formatNumber(report.reads)} source records read</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {reportType === 'GSTR9' ? (
        <Alert severity="warning">
          <Typography variant="h6">GSTR-9 annual return</Typography>
          <Typography variant="body2">Annual reconciliation is not available yet. Use GSTR-3B with a financial-year date range and export the workbook for review.</Typography>
        </Alert>
      ) : (
        <Stack spacing={2.4}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
              alignItems: 'stretch',
              '& > .MuiCard-root': { minHeight: 150 },
            }}
          >
            <MetricCard label="Outward taxable" value={formatCurrency(summary.outward.taxable)} helper={`${formatNumber(report.outward.length)} GST invoices`} icon={TrendingUpRoundedIcon} />
            <MetricCard label="Output GST" value={formatCurrency(summary.outward.gst)} helper={`CGST ${formatCurrency(summary.outward.cgst)} · SGST ${formatCurrency(summary.outward.sgst)}`} icon={ReceiptLongRoundedIcon} tone="success" />
            <MetricCard label="Input GST" value={formatCurrency(summary.inward.gst)} helper={`${formatNumber(report.inward.length)} purchase records`} icon={SouthWestRoundedIcon} tone="warning" />
            <MetricCard label={summary.netGstLiability >= 0 ? 'Net GST payable' : 'GST refundable'} value={formatCurrency(Math.abs(summary.netGstLiability))} helper={summary.netGstLiability >= 0 ? 'Output GST less input GST' : 'Input credit exceeds output GST'} icon={AccountBalanceRoundedIcon} tone={summary.netGstLiability >= 0 ? 'error' : 'success'} />
          </Box>

          {reportType === 'GSTR3B' && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'stretch' }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 2.3, md: 2.7 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ minHeight: 54 }}>
                      <Box><Typography variant="overline" color="success.main">OUTWARD SUPPLIES</Typography><Typography variant="h6">GST invoices issued</Typography></Box>
                      <TrendingUpRoundedIcon color="success" />
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2.2, mt: 'auto' }}>
                      {[
                        ['Taxable value', formatCurrency(summary.outward.taxable), 'text.primary'],
                        ['GST collected', formatCurrency(summary.outward.gst), 'success.main'],
                        ['Bricks invoiced', formatNumber(summary.outward.bricks), 'text.primary'],
                        ['Invoice count', formatNumber(report.outward.length), 'text.primary'],
                      ].map(([label, value, color]) => <Box key={label} sx={{ minHeight: 60 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ mt: 0.45, color, fontWeight: 850 }}>{value}</Typography></Box>)}
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 2.3, md: 2.7 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ minHeight: 54 }}>
                      <Box><Typography variant="overline" color="warning.main">INWARD SUPPLIES</Typography><Typography variant="h6">Purchases and input credit</Typography></Box>
                      <SouthWestRoundedIcon color="warning" />
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2.2, mt: 'auto' }}>
                      {[
                        ['Taxable value', formatCurrency(summary.inward.taxable), 'text.primary'],
                        ['Input GST', formatCurrency(summary.inward.gst), 'warning.main'],
                        ['Total bill value', formatCurrency(summary.inward.total), 'text.primary'],
                        ['Purchase count', formatNumber(report.inward.length), 'text.primary'],
                      ].map(([label, value, color]) => <Box key={label} sx={{ minHeight: 60 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ mt: 0.45, color, fontWeight: 850 }}>{value}</Typography></Box>)}
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Card sx={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F2EC 100%)' }}>
                <CardContent sx={{ p: { xs: 2.3, md: 2.8 } }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.35fr 1fr auto 1fr', lg: '1.5fr 1fr auto 1fr 1.35fr' }, gap: { xs: 1.8, md: 2.4 }, alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <SummarizeRoundedIcon color="primary" />
                      <Box><Typography variant="overline" color="primary.main">NET LIABILITY</Typography><Typography variant="h6">GSTR-3B calculation</Typography></Box>
                    </Stack>
                    <Box><Typography variant="caption" color="text.secondary">Output GST</Typography><Typography variant="h5" color="success.main" sx={{ fontWeight: 850 }}>{formatCurrency(summary.outward.gst)}</Typography></Box>
                    <Typography variant="h4" color="text.secondary" textAlign="center">−</Typography>
                    <Box><Typography variant="caption" color="text.secondary">Input GST</Typography><Typography variant="h5" color="warning.main" sx={{ fontWeight: 850 }}>{formatCurrency(summary.inward.gst)}</Typography></Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' }, p: 2, borderRadius: 3, bgcolor: summary.netGstLiability >= 0 ? 'rgba(188,75,75,.08)' : 'rgba(52,120,94,.08)' }}>
                      <Typography variant="caption" color="text.secondary">{summary.netGstLiability >= 0 ? 'GST payable' : 'GST refundable'}</Typography>
                      <Typography variant="h4" color={summary.netGstLiability >= 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 900 }}>{formatCurrency(Math.abs(summary.netGstLiability))}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </>
          )}

          {showOutward && (
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1.2} sx={{ mb: 2 }}>
                  <Box sx={{ minWidth: 0 }}><Typography variant="h6">GSTR-1 · Outward supplies</Typography><Typography variant="body2" color="text.secondary">GST invoice numbers originate from Sales → Customer report and follow the sequence configured in Settings.</Typography></Box>
                  <StatusPill label={`${report.outward.length} invoices`} tone="success" />
                </Stack>
                <ResponsiveRecordTable rows={report.outward} columns={outwardColumns} loading={loading} emptyTitle="No generated GST invoices in this period" mobileTitle={(row) => row.invoiceNumber} mobileSubtitle={(row) => `${row.customerName} · ${formatCurrency(row.totalValue)}`} />
              </CardContent>
            </Card>
          )}

          {showInward && (
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1.2} sx={{ mb: 2 }}>
                  <Box sx={{ minWidth: 0 }}><Typography variant="h6">GSTR-2 · Inward supplies</Typography><Typography variant="body2" color="text.secondary">Purchase bills recorded from Inventory and Supplier Management, including material purchases.</Typography></Box>
                  <StatusPill label={`${report.inward.length} purchases`} tone="warning" />
                </Stack>
                <ResponsiveRecordTable rows={report.inward} columns={inwardColumns} loading={loading} emptyTitle="No purchases in this period" mobileTitle={(row) => row.supplierName} mobileSubtitle={(row) => `${row.billNumber} · ${formatCurrency(row.totalValue)}`} />
              </CardContent>
            </Card>
          )}

          <Alert severity="warning">Verify GSTINs, place of supply and tax treatment before filing. This screen prepares operational reports; it does not submit returns to the GST portal.</Alert>
        </Stack>
      )}
    </>
  );
};

export default GstReportsPage;
