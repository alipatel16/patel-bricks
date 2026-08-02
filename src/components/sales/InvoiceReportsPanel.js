import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog';
import CursorPagination from '../common/CursorPagination';
import ResponsiveRecordTable from '../data/ResponsiveRecordTable';
import StatusPill from '../data/StatusPill';
import GeneratedInvoiceDocument from './GeneratedInvoiceDocument';
import { useCursorPager } from '../../hooks/useCursorPager';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { invoiceReportService } from '../../services/invoiceReportService';
import { formatCurrency, formatNumber } from '../../services/queryUtils';

const invoiceLabel = (invoice) => invoice.gstInvoiceNumber || 'Non-GST invoice';

const InvoiceReportsPanel = ({ settings, refreshToken = 0, initialInvoice = null, onInitialInvoiceHandled }) => {
  const [filters, setFilters] = useState({ searchTerm: '', dateFrom: '', dateTo: '', invoiceType: 'all' });
  const debouncedSearch = useDebouncedValue(filters.searchTerm, 350);
  const effectiveSearch = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : '';
  const [viewer, setViewer] = useState(initialInvoice);
  const [component, setComponent] = useState('combined');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', fromDate: '', toDate: '', selectedSite: '', gstBricks: 0, nonGstBricks: 0, rate: 0, gstRate: 12, notes: '' });
  const [busy, setBusy] = useState(false);
  const documentRef = useRef(null);

  React.useEffect(() => {
    if (initialInvoice) {
      setViewer(initialInvoice);
      setComponent(initialInvoice.gstBricks > 0 && initialInvoice.nonGstBricks > 0 ? 'combined' : initialInvoice.gstBricks > 0 ? 'gst' : 'nonGst');
      onInitialInvoiceHandled?.();
    }
  }, [initialInvoice, onInitialInvoiceHandled]);

  const loader = useCallback(({ cursor, pageSize }) => invoiceReportService.getInvoicesPage({
    cursor,
    pageSize,
    ...filters,
    searchTerm: effectiveSearch,
  }), [effectiveSearch, filters.dateFrom, filters.dateTo, filters.invoiceType]);
  const pager = useCursorPager({
    loader,
    dependencies: [effectiveSearch, filters.dateFrom, filters.dateTo, filters.invoiceType, refreshToken],
    pageSize: 10,
  });

  const openViewer = useCallback((invoice) => {
    setViewer(invoice);
    setComponent(invoice.gstBricks > 0 && invoice.nonGstBricks > 0 ? 'combined' : invoice.gstBricks > 0 ? 'gst' : 'nonGst');
  }, []);

  const openEditor = useCallback((invoice) => {
    setEditTarget(invoice);
    setEditForm({ date: invoice.date || '', fromDate: invoice.fromDate || '', toDate: invoice.toDate || '', selectedSite: invoice.selectedSite || '', gstBricks: invoice.gstBricks || 0, nonGstBricks: invoice.nonGstBricks || 0, rate: invoice.rate || 0, gstRate: invoice.gstRate || settings?.invoice?.gstRate || 12, notes: invoice.notes || '' });
  }, [settings]);

  const actions = useCallback((invoice) => <Stack direction="row" spacing={0.2}>
    <Tooltip title="View invoice"><IconButton size="small" onClick={() => openViewer(invoice)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Edit generated invoice"><IconButton size="small" color="primary" onClick={() => openEditor(invoice)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Delete generated invoice"><IconButton size="small" color="error" onClick={() => setDeleteTarget(invoice)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
  </Stack>, [openViewer, openEditor]);

  const columns = useMemo(() => [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'invoice', label: 'Invoice', render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{invoiceLabel(row)}</Typography><Typography variant="caption" color="text.secondary">{row.source === 'legacy' ? 'Legacy generated invoice' : 'Generated in Firestore'}</Typography></Box> },
    { key: 'customerName', label: 'Customer' },
    { key: 'selectedSite', label: 'Site' },
    { key: 'totalBricks', label: 'Bricks', align: 'right', render: (row) => formatNumber(row.totalBricks || Number(row.gstBricks || 0) + Number(row.nonGstBricks || 0)) },
    { key: 'type', label: 'Type', render: (row) => <Stack direction="row" spacing={0.5}>{row.gstBricks > 0 && <StatusPill label="GST" tone="success" />}{row.nonGstBricks > 0 && <StatusPill label="Non-GST" tone="neutral" />}</Stack> },
    { key: 'totalAmount', label: 'Amount', align: 'right', render: (row) => formatCurrency(row.totalAmount || Number(row.gstAmount || 0) + Number(row.nonGstAmount || 0)) },
    { key: 'actions', label: '', align: 'right', render: actions, mobileHidden: true },
  ], [actions]);

  const downloadPdf = async () => {
    if (!documentRef.current || !viewer) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const image = canvas.toDataURL('image/png');
      let remaining = imageHeight;
      let position = 0;
      pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight);
      remaining -= pageHeight;
      while (remaining > 0) {
        position = remaining - imageHeight;
        pdf.addPage();
        pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight);
        remaining -= pageHeight;
      }
      const fileLabel = viewer.gstInvoiceNumber || `non-gst-${viewer.id?.slice(-8) || 'invoice'}`;
      pdf.save(`${fileLabel}-${component}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Unable to generate PDF.');
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await invoiceReportService.updateInvoice(editTarget.id, editForm);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Generated invoice updated.');
    setEditTarget(null);
    pager.refresh();
    if (viewer?.id === result.data.id) setViewer(result.data);
    return null;
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await invoiceReportService.deleteInvoice(deleteTarget.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Generated invoice deleted.');
    setDeleteTarget(null);
    pager.refresh();
    return null;
  };

  return <>
    <Card><CardContent sx={{ p: { xs: 1.8, md: 2.5 } }}>
      <Box sx={{ mb: 2.1 }}><Typography variant="h6">Invoice reports</Typography><Typography variant="body2" color="text.secondary">All legacy and newly generated GST/non-GST invoices, loaded with cursor pagination.</Typography></Box>
      <Grid container spacing={1.4} alignItems="flex-start" sx={{ mb: 2.2 }}>
        <Grid item xs={12} md={5}><TextField label="Search invoice/customer" value={filters.searchTerm} onChange={(event) => setFilters((current) => ({ ...current, searchTerm: event.target.value }))} helperText={filters.searchTerm.length === 1 ? 'Enter one more character.' : 'Search starts after 2 characters.'} fullWidth /></Grid>
        <Grid item xs={12} sm={6} md={2.5}><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} helperText="Start date" fullWidth /></Grid>
        <Grid item xs={12} sm={6} md={2.5}><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} helperText="End date" fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField select label="Invoice type" value={filters.invoiceType} onChange={(event) => setFilters((current) => ({ ...current, invoiceType: event.target.value }))} helperText="GST filter" fullWidth><MenuItem value="all">All</MenuItem><MenuItem value="GST">GST</MenuItem><MenuItem value="NON_GST">Non-GST</MenuItem></TextField></Grid>
      </Grid>
      {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
      <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No generated invoices found" mobileTitle={invoiceLabel} mobileSubtitle={(row) => `${row.customerName} · ${formatCurrency(row.totalAmount)}`} mobileActions={actions} />
      <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
    </CardContent></Card>

    <Dialog open={Boolean(viewer)} onClose={busy ? undefined : () => setViewer(null)} maxWidth="lg" fullWidth>
      <DialogTitle className="no-print"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
        <span>{viewer ? invoiceLabel(viewer) : ''}</span>
        <Stack direction="row" spacing={1}><TextField size="small" select value={component} onChange={(event) => setComponent(event.target.value)} sx={{ minWidth: 145 }}><MenuItem value="combined">Combined</MenuItem>{Number(viewer?.gstBricks) > 0 && <MenuItem value="gst">GST only</MenuItem>}{Number(viewer?.nonGstBricks) > 0 && <MenuItem value="nonGst">Non-GST only</MenuItem>}</TextField><Button startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>Print</Button><Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={downloadPdf} disabled={busy}>{busy ? 'Preparing…' : 'PDF'}</Button></Stack>
      </Stack></DialogTitle>
      <DialogContent sx={{ p: { xs: 0, sm: 2 }, bgcolor: "#ECE9E4" }}><GeneratedInvoiceDocument ref={documentRef} invoice={viewer} settings={settings} component={component} /></DialogContent>
      <DialogActions className="no-print"><Button onClick={() => setViewer(null)}>Close</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(editTarget)} onClose={busy ? undefined : () => setEditTarget(null)} maxWidth="md" fullWidth><form onSubmit={submitEdit}><DialogTitle>Edit generated invoice · {editTarget ? invoiceLabel(editTarget) : ''}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">GST invoice numbers are assigned automatically from Settings only when GST bricks are present. Non-GST invoices do not receive an invoice number.</Alert><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField required type="date" label="Invoice date" InputLabelProps={{ shrink: true }} value={editForm.date} onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))} fullWidth /><TextField required type="date" label="From sales date" InputLabelProps={{ shrink: true }} value={editForm.fromDate} onChange={(event) => setEditForm((current) => ({ ...current, fromDate: event.target.value }))} fullWidth /><TextField required type="date" label="To sales date" InputLabelProps={{ shrink: true }} value={editForm.toDate} onChange={(event) => setEditForm((current) => ({ ...current, toDate: event.target.value }))} fullWidth /></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField required label="Site" value={editForm.selectedSite} onChange={(event) => setEditForm((current) => ({ ...current, selectedSite: event.target.value }))} fullWidth /><TextField label="GST invoice number" value={editTarget?.gstInvoiceNumber || (Number(editForm.gstBricks) > 0 ? 'Will be assigned from Settings' : 'Not applicable')} disabled fullWidth /><TextField label="Rate" type="number" value={editForm.rate} onChange={(event) => setEditForm((current) => ({ ...current, rate: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} fullWidth /></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="GST bricks" type="number" value={editForm.gstBricks} onChange={(event) => setEditForm((current) => ({ ...current, gstBricks: event.target.value }))} inputProps={{ min: 0 }} fullWidth /><TextField label="Non-GST bricks" type="number" value={editForm.nonGstBricks} onChange={(event) => setEditForm((current) => ({ ...current, nonGstBricks: event.target.value }))} inputProps={{ min: 0 }} fullWidth /><TextField label="GST %" type="number" value={editForm.gstRate} onChange={(event) => setEditForm((current) => ({ ...current, gstRate: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} fullWidth /></Stack><TextField label="Notes" value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} /></Stack></DialogContent><DialogActions><Button onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Update invoice'}</Button></DialogActions></form></Dialog>
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this generated invoice?" description="This removes only the generated report. It does not delete the underlying sales." busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
  </>;
};

export default InvoiceReportsPanel;
