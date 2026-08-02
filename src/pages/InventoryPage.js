import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GrainRoundedIcon from '@mui/icons-material/GrainRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LandscapeRoundedIcon from '@mui/icons-material/LandscapeRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import { alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import CursorPagination from '../components/common/CursorPagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import StatusPill from '../components/data/StatusPill';
import AsyncSearchField from '../components/forms/AsyncSearchField';
import { useCursorPager } from '../hooks/useCursorPager';
import { inventoryService } from '../services/inventoryService';
import { supplierService } from '../services/supplierService';
import { dateKey, formatCurrency, formatNumber } from '../services/queryUtils';

const stockTypes = [
  ['bricks', 'Bricks'],
  ['cement', 'Cement'],
  ['sand', 'Sand'],
  ['fly_ash', 'Fly ash'],
  ['dust', 'Dust'],
  ['lime', 'Lime'],
  ['chemical', 'Chemical'],
];

const materialDefinitions = [
  { key: 'sand', label: 'Sand', icon: LandscapeRoundedIcon, tone: 'warning' },
  { key: 'fly_ash', label: 'Fly ash', icon: LocalShippingRoundedIcon, tone: 'info' },
  { key: 'dust', label: 'Dust', icon: BlurOnRoundedIcon, tone: 'secondary' },
  { key: 'lime', label: 'Lime', icon: GrainRoundedIcon, tone: 'success' },
  { key: 'chemical', label: 'Chemical', icon: ScienceRoundedIcon, tone: 'primary' },
];

const defaultUnitFor = (stockType, materialUnits = {}) => {
  if (stockType === 'cement') return 'bags';
  if (stockType === 'bricks') return 'bricks';
  return materialUnits[stockType] || (stockType === 'chemical' ? 'litres' : 'tons');
};

const MaterialTile = ({ definition, quantity, unit }) => {
  const Icon = definition.icon;
  return (
    <Box sx={(theme) => ({
      height: '100%',
      p: 2.1,
      borderRadius: 3,
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: '#FCFBF8',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 1.5,
    })}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 750 }}>{definition.label}</Typography>
        <Typography variant="h5" sx={{ mt: 0.8, lineHeight: 1.15 }}>{formatNumber(quantity)}</Typography>
        <Typography variant="caption" color="text.secondary">{unit || 'units'} available</Typography>
      </Box>
      <Box sx={(theme) => ({
        width: 42,
        height: 42,
        flexShrink: 0,
        borderRadius: 2.5,
        display: 'grid',
        placeItems: 'center',
        color: `${definition.tone}.main`,
        bgcolor: alpha(theme.palette[definition.tone]?.main || theme.palette.primary.main, 0.1),
      })}>
        <Icon fontSize="small" />
      </Box>
    </Box>
  );
};

const InventoryPage = () => {
  const [inventory, setInventory] = useState(null);
  const [tab, setTab] = useState('transactions');
  const [filters, setFilters] = useState({ stockType: 'all', transactionType: 'all' });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ stockType: 'bricks', quantity: '', operation: 'add', date: dateKey(), notes: '' });
  const [purchaseForm, setPurchaseForm] = useState({ stockType: 'cement', quantity: '', unit: 'bags', unitCost: '', gstRate: '0', billNumber: '', date: dateKey(), notes: '', supplier: null });

  const loadInventory = useCallback(async () => {
    const result = await inventoryService.getInventory();
    if (result.success) setInventory(result.data);
    else toast.error(result.error);
  }, []);
  useEffect(() => { loadInventory(); }, [loadInventory]);

  const loader = useCallback(({ cursor, pageSize }) => {
    if (tab === 'purchases') return inventoryService.getPurchasesPage({ cursor, pageSize, stockType: filters.stockType });
    return inventoryService.getTransactionsPage({ cursor, pageSize, ...filters });
  }, [tab, filters]);
  const pager = useCursorPager({ loader, dependencies: [tab, filters.stockType, filters.transactionType], pageSize: 10 });

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await inventoryService.adjustStock(adjustForm);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Inventory adjustment saved.');
    setAdjustOpen(false);
    loadInventory();
    pager.refresh();
    return null;
  };

  const submitPurchase = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await inventoryService.recordPurchase(purchaseForm);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Purchase recorded and stock updated.');
    setPurchaseOpen(false);
    setPurchaseForm({ stockType: 'cement', quantity: '', unit: 'bags', unitCost: '', gstRate: '0', billNumber: '', date: dateKey(), notes: '', supplier: null });
    setTab('purchases');
    loadInventory();
    pager.refresh();
    return null;
  };

  const confirmDelete = async () => {
    setBusy(true);
    const result = await inventoryService.deletePurchase(deleteRecord.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Purchase deleted and stock reversed.');
    setDeleteRecord(null);
    loadInventory();
    pager.refresh();
    return null;
  };

  const purchaseActions = useCallback((row) => (
    <Tooltip title="Delete purchase"><IconButton size="small" color="error" onClick={() => setDeleteRecord(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
  ), []);

  const columns = useMemo(() => tab === 'purchases' ? [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'purchaseNumber', label: 'Purchase' },
    { key: 'stockType', label: 'Material', render: (row) => stockTypes.find(([value]) => value === row.stockType)?.[1] || row.stockType },
    { key: 'supplierName', label: 'Supplier', render: (row) => row.supplierName || 'Direct purchase' },
    { key: 'quantity', label: 'Quantity', align: 'right', render: (row) => `${formatNumber(row.quantity)} ${row.unit || ''}` },
    { key: 'unitCost', label: 'Rate', align: 'right', render: (row) => formatCurrency(row.unitCost) },
    { key: 'gstAmount', label: 'GST', align: 'right', render: (row) => formatCurrency(row.gstAmount) },
    { key: 'totalAmount', label: 'Amount', align: 'right', render: (row) => formatCurrency(row.totalAmount) },
    { key: 'actions', label: '', align: 'right', render: purchaseActions, mobileHidden: true },
  ] : [
    { key: 'date', label: 'Date', nowrap: true },
    { key: 'stockType', label: 'Stock', render: (row) => stockTypes.find(([value]) => value === row.stockType)?.[1] || row.stockType },
    { key: 'transactionType', label: 'Type', render: (row) => <StatusPill status={row.transactionType} label={String(row.transactionType || 'legacy').replaceAll('_', ' ')} /> },
    { key: 'operation', label: 'Operation', render: (row) => <StatusPill status={row.operation} /> },
    { key: 'quantity', label: 'Quantity', align: 'right', render: (row) => formatNumber(row.quantity) },
    { key: 'notes', label: 'Notes' },
  ], [tab, purchaseActions]);

  const materials = inventory?.materials || {};
  const materialUnits = inventory?.materialUnits || {};

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock and purchase control"
        description="Track bricks, cement and every production material from one inventory record, with paginated movements and purchase history."
        action={<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" startIcon={<TuneRoundedIcon />} onClick={() => setAdjustOpen(true)}>Adjust stock</Button><Button variant="contained" startIcon={<AddBusinessRoundedIcon />} onClick={() => setPurchaseOpen(true)}>Record purchase</Button></Stack>}
      />

      <Grid container spacing={2.1} alignItems="stretch">
        <Grid item xs={12} md={6} sx={{ display: 'flex' }}><MetricCard label="Brick stock" value={formatNumber(inventory?.bricks)} helper="Calculated production less sales, including manual adjustments" icon={Inventory2RoundedIcon} /></Grid>
        <Grid item xs={12} md={6} sx={{ display: 'flex' }}><MetricCard label="Cement stock" value={`${formatNumber(inventory?.cementBags)} bags`} helper={inventory?.cementCostPerBag ? `${formatCurrency(inventory.cementCostPerBag)} latest cost per bag` : 'Current cement inventory'} icon={WaterDropRoundedIcon} tone="secondary" /></Grid>
      </Grid>

      <Card sx={{ mt: 2.1 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
            <Box><Typography variant="h6">Raw material stock</Typography><Typography variant="body2" color="text.secondary">Sand, fly ash, dust, lime and chemical are all stored and adjusted independently.</Typography></Box>
            <StatusPill label="5 materials" tone="info" />
          </Stack>
          <Grid container spacing={1.5} alignItems="stretch">
            {materialDefinitions.map((definition) => (
              <Grid key={definition.key} item xs={12} sm={6} md={4} xl={2.4} sx={{ display: 'flex' }}>
                <Box sx={{ width: '100%' }}><MaterialTile definition={definition} quantity={materials[definition.key]} unit={materialUnits[definition.key]} /></Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2.1 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}><Tab value="transactions" label="Stock movement" /><Tab value="purchases" label="Purchase history" /></Tabs>
          <Grid container spacing={1.25} alignItems="center" sx={{ mb: 2.25 }}>
            <Grid item xs={12} sm="auto"><TextField select label="Stock type" value={filters.stockType} onChange={(event) => setFilters((current) => ({ ...current, stockType: event.target.value }))} sx={{ minWidth: { sm: 180 } }} fullWidth><MenuItem value="all">All stock</MenuItem>{stockTypes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
            {tab === 'transactions' && <Grid item xs={12} sm="auto"><TextField select label="Movement" value={filters.transactionType} onChange={(event) => setFilters((current) => ({ ...current, transactionType: event.target.value }))} sx={{ minWidth: { sm: 190 } }} fullWidth><MenuItem value="all">All movement</MenuItem><MenuItem value="production">Production</MenuItem><MenuItem value="sale">Sale</MenuItem><MenuItem value="purchase">Purchase</MenuItem><MenuItem value="adjustment">Adjustment</MenuItem><MenuItem value="legacy">Legacy</MenuItem></TextField></Grid>}
            <Grid item xs={12} sm="auto"><Button onClick={() => setFilters({ stockType: 'all', transactionType: 'all' })} fullWidth>Clear filters</Button></Grid>
          </Grid>
          {pager.error && <Alert severity="error" sx={{ mb: 2 }}>{pager.error}</Alert>}
          <ResponsiveRecordTable rows={pager.rows} columns={columns} loading={pager.loading} emptyTitle={tab === 'purchases' ? 'No purchases recorded' : 'No stock movements'} mobileTitle={(row) => tab === 'purchases' ? (row.supplierName || row.purchaseNumber) : `${formatNumber(row.quantity)} ${row.stockType}`} mobileSubtitle={(row) => `${row.date} · ${row.transactionType || row.stockType}`} mobileActions={tab === 'purchases' ? purchaseActions : undefined} />
          <CursorPagination page={pager.page} hasMore={pager.hasMore} loading={pager.loading} onPrevious={pager.previous} onNext={pager.next} />
        </CardContent>
      </Card>

      <Dialog open={adjustOpen} onClose={busy ? undefined : () => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submitAdjustment}><DialogTitle>Adjust inventory</DialogTitle><DialogContent dividers sx={{ bgcolor: '#FAF8F4' }}><Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid item xs={12}><TextField select label="Stock type" value={adjustForm.stockType} onChange={(event) => setAdjustForm((current) => ({ ...current, stockType: event.target.value }))} fullWidth>{stockTypes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Operation" value={adjustForm.operation} onChange={(event) => setAdjustForm((current) => ({ ...current, operation: event.target.value }))} fullWidth><MenuItem value="add">Add stock</MenuItem><MenuItem value="subtract">Remove stock</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField label={`Quantity (${defaultUnitFor(adjustForm.stockType, materialUnits)})`} type="number" value={adjustForm.quantity} onChange={(event) => setAdjustForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} required fullWidth /></Grid>
          <Grid item xs={12}><TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={adjustForm.date} onChange={(event) => setAdjustForm((current) => ({ ...current, date: event.target.value }))} required fullWidth /></Grid>
          <Grid item xs={12}><TextField label="Reason / notes" value={adjustForm.notes} onChange={(event) => setAdjustForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} required fullWidth /></Grid>
        </Grid></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setAdjustOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save adjustment'}</Button></DialogActions></form>
      </Dialog>

      <Dialog open={purchaseOpen} onClose={busy ? undefined : () => setPurchaseOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={submitPurchase}><DialogTitle>Record material purchase</DialogTitle><DialogContent dividers sx={{ bgcolor: '#FAF8F4' }}><Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid item xs={12}><AsyncSearchField label="Supplier" value={purchaseForm.supplier} onChange={(supplier) => setPurchaseForm((current) => ({ ...current, supplier }))} search={supplierService.searchSuppliers} getOptionLabel={(option) => `${option.name}${option.gstin ? ` · ${option.gstin}` : ''}`} required={false} helperText="Optional. Type 2 characters to search suppliers." /></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Material" value={purchaseForm.stockType} onChange={(event) => { const stockType = event.target.value; setPurchaseForm((current) => ({ ...current, stockType, unit: defaultUnitFor(stockType, materialUnits) })); }} fullWidth>{stockTypes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField label="Unit" value={purchaseForm.unit} onChange={(event) => setPurchaseForm((current) => ({ ...current, unit: event.target.value }))} helperText="This unit is displayed in stock and GST purchase history." fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Quantity" type="number" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Cost per unit" type="number" value={purchaseForm.unitCost} onChange={(event) => setPurchaseForm((current) => ({ ...current, unitCost: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label="GST rate %" type="number" value={purchaseForm.gstRate} onChange={(event) => setPurchaseForm((current) => ({ ...current, gstRate: event.target.value }))} inputProps={{ min: 0, max: 28, step: '0.01' }} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Bill number" value={purchaseForm.billNumber} onChange={(event) => setPurchaseForm((current) => ({ ...current, billNumber: event.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} sm={6}><TextField type="date" label="Purchase date" InputLabelProps={{ shrink: true }} value={purchaseForm.date} onChange={(event) => setPurchaseForm((current) => ({ ...current, date: event.target.value }))} required fullWidth /></Grid>
          <Grid item xs={12} sm={6}><Box sx={{ height: '100%', minHeight: 70, p: 1.6, borderRadius: 2.5, border: '1px solid #E8E2D9', bgcolor: 'white' }}><Typography variant="caption" color="text.secondary">Estimated invoice total</Typography><Typography variant="h6" color="primary.main">{formatCurrency(Number(purchaseForm.quantity || 0) * Number(purchaseForm.unitCost || 0) * (1 + Number(purchaseForm.gstRate || 0) / 100))}</Typography></Box></Grid>
          <Grid item xs={12}><TextField label="Notes" value={purchaseForm.notes} onChange={(event) => setPurchaseForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth /></Grid>
        </Grid></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setPurchaseOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Record purchase'}</Button></DialogActions></form>
      </Dialog>

      <ConfirmDialog open={Boolean(deleteRecord)} title="Delete this purchase?" description="The purchased quantity will be removed from stock and supplier totals will be reversed. Deletion is blocked when that stock has already been consumed." busy={busy} onClose={() => setDeleteRecord(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default InventoryPage;
