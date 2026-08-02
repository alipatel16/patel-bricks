import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import LoadingState from '../components/common/LoadingState';
import ResponsiveRecordTable from '../components/data/ResponsiveRecordTable';
import { reportService } from '../services/reportService';
import { dateKey, formatCurrency, formatNumber } from '../services/queryUtils';

const ReportsPage = () => {
  const [filters, setFilters] = useState({ mode: 'month', dateFrom: dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), dateTo: dateKey() });
  const [state, setState] = useState({ loading: true, error: '', data: { summary: {}, rows: [] } });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const result = await reportService.getSummary(filters);
    setState({ loading: false, error: result.success ? '' : result.error, data: result.success ? result.data : { summary: {}, rows: [] } });
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    const rows = state.data.rows.map((row) => ({
      Date: row.date,
      Production: row.productionQuantity || 0,
      'Cement Used': row.cementUsed || 0,
      'Sales Quantity': row.salesQuantity || 0,
      'Sales Amount': row.salesAmount || 0,
      'Amount Received': row.amountReceived || 0,
      Outstanding: row.outstandingAmount || 0,
      Purchases: row.purchaseAmount || 0,
      GST: row.gstCollected || 0,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Business Report');
    XLSX.writeFile(workbook, `patel-bricks-report-${filters.mode}-${dateKey()}.xlsx`);
  };

  const summary = state.data.summary || {};
  const profitProxy = Number(summary.salesAmount || 0) - Number(summary.purchaseAmount || 0);
  const columns = useMemo(() => [
    { key: 'date', label: 'Date' },
    { key: 'productionQuantity', label: 'Production', align: 'right', render: (row) => formatNumber(row.productionQuantity) },
    { key: 'salesQuantity', label: 'Sold', align: 'right', render: (row) => formatNumber(row.salesQuantity) },
    { key: 'salesAmount', label: 'Sales', align: 'right', render: (row) => formatCurrency(row.salesAmount) },
    { key: 'amountReceived', label: 'Received', align: 'right', render: (row) => formatCurrency(row.amountReceived) },
    { key: 'purchaseAmount', label: 'Purchases', align: 'right', render: (row) => formatCurrency(row.purchaseAmount) },
  ], []);

  return (
    <>
      <PageHeader eyebrow="Reports" title="Performance and cash view" description="Reports read daily summary documents rather than scanning invoices or production records. Custom ranges are limited to one year." action={<Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportExcel} disabled={!state.data.rows.length}>Export Excel</Button>} />
      <Card sx={{ mb: 2.1 }}><CardContent sx={{ p: { xs: 2, md: 2.5 } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <TextField select label="Period" value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value }))} sx={{ minWidth: 160 }}><MenuItem value="today">Today</MenuItem><MenuItem value="month">This month</MenuItem><MenuItem value="custom">Custom range</MenuItem></TextField>
        {filters.mode === 'custom' && <><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></>}
      </Stack></CardContent></Card>
      {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}
      {state.loading ? <LoadingState /> : <>
        <Grid container spacing={2.1}>
          <Grid item xs={6} lg={3}><MetricCard label="Sales" value={formatCurrency(summary.salesAmount)} helper={`${formatNumber(summary.salesQuantity)} bricks`} icon={CurrencyRupeeRoundedIcon} /></Grid>
          <Grid item xs={6} lg={3}><MetricCard label="Production" value={formatNumber(summary.productionQuantity)} helper={`${formatNumber(summary.cementUsed)} cement bags`} icon={PrecisionManufacturingRoundedIcon} tone="secondary" /></Grid>
          <Grid item xs={6} lg={3}><MetricCard label="Purchases" value={formatCurrency(summary.purchaseAmount)} helper={`${formatNumber(summary.purchaseCount)} entries`} icon={Inventory2RoundedIcon} tone="warning" /></Grid>
          <Grid item xs={6} lg={3}><MetricCard label="Operating spread" value={formatCurrency(profitProxy)} helper="Sales minus recorded purchases" icon={TrendingUpRoundedIcon} tone={profitProxy >= 0 ? 'success' : 'error'} /></Grid>
        </Grid>
        <Grid container spacing={2.1} sx={{ mt: 0.1 }}>
          <Grid item xs={12} lg={7}><Card><CardContent sx={{ p: { xs: 2, md: 3 } }}><Typography variant="h6">Sales and collections</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Daily financial movement.</Typography><div style={{ height: 320 }}><ResponsiveContainer><BarChart data={state.data.rows}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} fontSize={12}/><YAxis fontSize={12}/><Tooltip formatter={(value) => formatCurrency(value)}/><Legend/><Bar dataKey="salesAmount" name="Sales" fill="#A84F32" radius={[6,6,0,0]}/><Bar dataKey="amountReceived" name="Received" fill="#2F6C62" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></CardContent></Card></Grid>
          <Grid item xs={12} lg={5}><Card><CardContent sx={{ p: { xs: 2, md: 3 } }}><Typography variant="h6">Production trend</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bricks produced and sold.</Typography><div style={{ height: 320 }}><ResponsiveContainer><LineChart data={state.data.rows}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} fontSize={12}/><YAxis fontSize={12}/><Tooltip formatter={(value) => formatNumber(value)}/><Legend/><Line type="monotone" dataKey="productionQuantity" name="Produced" stroke="#2F6C62" strokeWidth={2.5}/><Line type="monotone" dataKey="salesQuantity" name="Sold" stroke="#A84F32" strokeWidth={2.5}/></LineChart></ResponsiveContainer></div></CardContent></Card></Grid>
        </Grid>
        <Card sx={{ mt: 2.1 }}><CardContent sx={{ p: { xs: 2, md: 2.5 } }}><Typography variant="h6" sx={{ mb: 2 }}>Daily summary</Typography><ResponsiveRecordTable rows={state.data.rows} columns={columns} loading={false} emptyTitle="No summary data" mobileTitle={(row) => row.date} mobileSubtitle={(row) => `${formatCurrency(row.salesAmount)} sales`} /></CardContent></Card>
      </>}
    </>
  );
};

export default ReportsPage;
