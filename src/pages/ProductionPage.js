import React, { useCallback, useMemo, useState } from 'react';
import {
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
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import CursorPagination from '../components/common/CursorPagination';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useCursorPager } from '../hooks/useCursorPager';
import { productionService } from '../services/productionService';
import { dateKey, formatNumber } from '../services/queryUtils';

const emptyForm = {
  date: dateKey(),
  quantity: '',
  cementUsed: '',
  rejectedQuantity: '0',
  shift: 'day',
  grade: 'A',
  notes: '',
};

const ProductionPage = () => {
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', shift: 'all' });
  const [dialog, setDialog] = useState({ open: false, record: null });
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);

  const loader = useCallback(({ cursor, pageSize }) => productionService.getProductionPage({ cursor, pageSize, ...filters }), [filters]);
  const pager = useCursorPager({ loader, dependencies: [filters.dateFrom, filters.dateTo, filters.shift], pageSize: 10 });

  const openCreate = () => {
    setForm(emptyForm);
    setDialog({ open: true, record: null });
  };

  const openEdit = (record) => {
    setForm({
      date: record.date || dateKey(),
      quantity: record.quantity ?? '',
      cementUsed: record.cementUsed ?? '',
      rejectedQuantity: record.rejectedQuantity ?? 0,
      shift: record.shift || 'day',
      grade: record.grade || 'A',
      notes: record.notes || '',
    });
    setDialog({ open: true, record });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = dialog.record
      ? await productionService.updateProduction(dialog.record.id, form)
      : await productionService.addProduction(form);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success(dialog.record ? 'Production entry updated.' : 'Production recorded.');
    setDialog({ open: false, record: null });
    pager.refresh();
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await productionService.deleteProduction(deleteRecord.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Production entry deleted and stock reversed.');
    setDeleteRecord(null);
    pager.refresh();
  };

  const actions = useCallback((row) => (
    <Stack direction="row" spacing={0.25}>
      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteRecord(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  ), []);

  const columns = useMemo(() => [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'quantity', label: 'Produced', align: 'right', render: (row) => formatNumber(row.quantity) },
    { key: 'cementUsed', label: 'Cement', align: 'right', render: (row) => `${formatNumber(row.cementUsed)} bags` },
    { key: 'rejectedQuantity', label: 'Rejected', align: 'right', render: (row) => formatNumber(row.rejectedQuantity) },
    { key: 'shift', label: 'Shift', render: (row) => String(row.shift || 'day').replace(/^./, (letter) => letter.toUpperCase()) },
    { key: 'grade', label: 'Grade' },
    { key: 'actions', label: '', align: 'right', render: actions, mobileHidden: true },
  ], [actions]);

  return (
    <>
      <PageHeader
        eyebrow="Production"
        title="Daily production register"
        description="Each page reads only ten Firestore documents. Production writes update inventory and reporting totals atomically."
        action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>Record production</Button>}
      />
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 2.5 }}>
            <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
            <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
            <TextField select label="Shift" value={filters.shift} onChange={(event) => setFilters((current) => ({ ...current, shift: event.target.value }))} sx={{ minWidth: 150 }}>
              <MenuItem value="all">All shifts</MenuItem><MenuItem value="day">Day</MenuItem><MenuItem value="night">Night</MenuItem><MenuItem value="morning">Morning</MenuItem>
            </TextField>
            <Button onClick={() => setFilters({ dateFrom: '', dateTo: '', shift: 'all' })}>Clear</Button>
          </Stack>
          {pager.error && <Typography color="error" sx={{ mb: 2 }}>{pager.error}</Typography>}
          <ResponsiveRecordTable
            rows={pager.rows}
            columns={columns}
            loading={pager.loading}
            emptyTitle="No production entries"
            emptyDescription="Record your first production batch or change the filters."
            mobileTitle={(row) => `${formatNumber(row.quantity)} bricks`}
            mobileSubtitle={(row) => `${row.date} · ${row.shift || 'day'} shift`}
            mobileActions={actions}
          />
          <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onClose={busy ? undefined : () => setDialog({ open: false, record: null })} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{dialog.record ? 'Edit production' : 'Record production'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField type="date" label="Production date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Bricks produced" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
                <TextField label="Cement used (bags)" type="number" value={form.cementUsed} onChange={(event) => setForm((current) => ({ ...current, cementUsed: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} required fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField select label="Shift" value={form.shift} onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value }))} fullWidth>
                  <MenuItem value="day">Day</MenuItem><MenuItem value="night">Night</MenuItem><MenuItem value="morning">Morning</MenuItem>
                </TextField>
                <TextField select label="Quality grade" value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} fullWidth>
                  <MenuItem value="A">A</MenuItem><MenuItem value="B">B</MenuItem><MenuItem value="C">C</MenuItem>
                </TextField>
              </Stack>
              <TextField label="Rejected bricks" type="number" value={form.rejectedQuantity} onChange={(event) => setForm((current) => ({ ...current, rejectedQuantity: event.target.value }))} inputProps={{ min: 0 }} />
              <TextField label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setDialog({ open: false, record: null })} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save production'}</Button></DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog open={Boolean(deleteRecord)} title="Delete production entry?" description="Brick stock will be reduced and cement stock restored. The action is blocked if those bricks have already been sold." busy={busy} onClose={() => setDeleteRecord(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default ProductionPage;
