import React, { useCallback, useMemo, useState } from 'react';
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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import CursorPagination from '../components/common/CursorPagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import StatusPill from '../components/data/StatusPill';
import { useCursorPager } from '../hooks/useCursorPager';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { supplierService } from '../services/supplierService';
import { formatCurrency, formatNumber } from '../services/queryUtils';

const blankSupplier = { name: '', gstin: '', type: 'Raw Material', phone: '', address: '', notes: '', status: 'active' };
const supplierTypes = ['Raw Material', 'Cement', 'Equipment', 'Fuel', 'Maintenance', 'Transport', 'Other'];

const SupplierPurchasesDialog = ({ supplier, onClose }) => {
  const loader = useCallback(({ cursor, pageSize }) => supplierService.getSupplierPurchasesPage({ supplierId: supplier.id, cursor, pageSize }), [supplier.id]);
  const pager = useCursorPager({ loader, dependencies: [supplier.id], pageSize: 8 });
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'purchaseNumber', label: 'Purchase' },
    { key: 'stockType', label: 'Material' },
    { key: 'quantity', label: 'Quantity', align: 'right', render: (row) => `${formatNumber(row.quantity)} ${row.unit || ''}` },
    { key: 'totalAmount', label: 'Total', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
  ];
  return (
    <Dialog open={Boolean(supplier)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{supplier.name} · Purchases</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#FAF8F4' }}>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Purchase count</Typography><Typography variant="h6">{formatNumber(supplier.totalPurchases)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Total value</Typography><Typography variant="h6">{formatCurrency(supplier.totalAmount)}</Typography></Box>
          <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Last purchase</Typography><Typography variant="h6">{supplier.lastPurchaseDate || '—'}</Typography></Box>
        </Stack>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No purchases for this supplier" mobileTitle={(row) => row.purchaseNumber} mobileSubtitle={(row) => `${row.date} · ${formatCurrency(row.totalAmount)}`} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};

const SuppliersPage = () => {
  const [filters, setFilters] = useState({ searchTerm: '', status: 'all' });
  const debounced = useDebouncedValue(filters.searchTerm, 350);
  const effectiveSearch = debounced.trim().length >= 2 ? debounced.trim() : '';
  const [dialog, setDialog] = useState({ open: false, supplier: null });
  const [form, setForm] = useState(blankSupplier);
  const [purchaseSupplier, setPurchaseSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(({ cursor, pageSize }) => supplierService.getSuppliersPage({ cursor, pageSize, searchTerm: effectiveSearch, status: filters.status }), [effectiveSearch, filters.status]);
  const pager = useCursorPager({ loader, dependencies: [effectiveSearch, filters.status], pageSize: 10 });

  const openCreate = () => { setForm(blankSupplier); setDialog({ open: true, supplier: null }); };
  const openEdit = (supplier) => { setForm({ name: supplier.name || '', gstin: supplier.gstin || '', type: supplier.type || 'Raw Material', phone: supplier.phone || '', address: supplier.address || '', notes: supplier.notes || '', status: supplier.status || 'active' }); setDialog({ open: true, supplier }); };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = dialog.supplier ? await supplierService.updateSupplier(dialog.supplier.id, form) : await supplierService.createSupplier(form);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(dialog.supplier ? 'Supplier updated.' : 'Supplier created.');
    setDialog({ open: false, supplier: null });
    pager.refresh();
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await supplierService.deleteSupplier(deleteSupplier.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(result.message || 'Supplier removed.');
    setDeleteSupplier(null);
    pager.refresh();
  };

  const actions = useCallback((row) => (
    <Stack direction="row" spacing={0.15}>
      <Tooltip title="Purchases"><IconButton size="small" color="primary" onClick={() => setPurchaseSupplier(row)}><ReceiptLongRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteSupplier(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  ), []);

  const columns = useMemo(() => [
    { key: 'name', label: 'Supplier', render: (row) => <Box><Typography variant="body2" sx={{ fontWeight: 800 }}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.type}</Typography></Box> },
    { key: 'phone', label: 'Phone' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'totalPurchases', label: 'Purchases', align: 'right', render: (row) => formatNumber(row.totalPurchases) },
    { key: 'totalAmount', label: 'Total value', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', label: '', align: 'right', render: actions, mobileHidden: true },
  ], [actions]);

  return (
    <>
      <PageHeader eyebrow="Suppliers" title="Supplier directory" description="Supplier autocomplete and directory search both query Firestore only after two characters, with small bounded result sets." action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>Add supplier</Button>} />
      <Card><CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2.25 }}>
          <TextField label="Search supplier or GSTIN" value={filters.searchTerm} onChange={(event) => setFilters((current) => ({ ...current, searchTerm: event.target.value }))} helperText={filters.searchTerm.length === 1 ? 'Enter one more character.' : 'Search starts after 2 characters.'} sx={{ minWidth: { sm: 300 } }} />
          <TextField select label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} sx={{ minWidth: 140 }}><MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem><MenuItem value="blocked">Blocked</MenuItem></TextField>
          <Button onClick={() => setFilters({ searchTerm: '', status: 'all' })}>Clear</Button>
        </Stack>
        {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
        <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle="No suppliers found" mobileTitle={(row) => row.name} mobileSubtitle={(row) => `${row.type} · ${formatCurrency(row.totalAmount)}`} mobileActions={actions} />
        <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
      </CardContent></Card>

      <Dialog open={dialog.open} onClose={busy ? undefined : () => setDialog({ open: false, supplier: null })} maxWidth="sm" fullWidth>
        <form onSubmit={submit}><DialogTitle>{dialog.supplier ? 'Edit supplier' : 'Add supplier'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Supplier name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField select label="Supplier type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} fullWidth>{supplierTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField><TextField label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} fullWidth /></Stack>
          <TextField label="GSTIN" value={form.gstin} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} />
          <TextField label="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} multiline minRows={2} />
          <TextField select label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem><MenuItem value="blocked">Blocked</MenuItem></TextField>
          <TextField label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} />
        </Stack></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDialog({ open: false, supplier: null })}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save supplier'}</Button></DialogActions></form>
      </Dialog>

      {purchaseSupplier && <SupplierPurchasesDialog supplier={purchaseSupplier} onClose={() => setPurchaseSupplier(null)} />}
      <ConfirmDialog open={Boolean(deleteSupplier)} title="Remove this supplier?" description="Suppliers with purchase history are marked inactive instead of being deleted." busy={busy} onClose={() => setDeleteSupplier(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default SuppliersPage;
