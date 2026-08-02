import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency, formatNumber } from '../services/queryUtils';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const result = await dashboardService.getDashboard();
    setState({ loading: false, data: result.success ? result.data : null, error: result.success ? '' : result.error });
  }, []);

  useEffect(() => { load(); }, [load]);
  if (state.loading) return <LoadingState label="Loading business overview…" />;

  const data = state.data || {};
  const today = data.today || {};
  const month = data.month || {};
  const inventory = data.inventory || {};
  const recent = [
    ...(data.recentSales || []).map((item) => ({ id: `s-${item.id}`, title: item.invoiceNumber, subtitle: `${item.customerName} · ${formatCurrency(item.totalAmount)}`, date: item.date, type: 'Sale' })),
    ...(data.recentProduction || []).map((item) => ({ id: `p-${item.id}`, title: `${formatNumber(item.quantity)} bricks produced`, subtitle: `${formatNumber(item.cementUsed)} cement bags used`, date: item.date, type: 'Production' })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 7);

  return (
    <>
      <PageHeader
        eyebrow="Operations overview"
        title="Control the day from one screen"
        description="Only compact aggregate documents and a few recent records are read for this dashboard."
        action={<Button variant="contained" startIcon={<ReceiptLongRoundedIcon />} onClick={() => navigate('/sales')}>Raise invoice</Button>}
      />
      {state.error && <Typography color="error" sx={{ mb: 2 }}>{state.error}</Typography>}
      <Grid container spacing={2.25}>
        <Grid item xs={12} sm={6} xl={3}><MetricCard label="Today's sales" value={formatCurrency(today.salesAmount)} helper={`${formatNumber(today.salesQuantity)} bricks`} icon={CurrencyRupeeRoundedIcon} /></Grid>
        <Grid item xs={12} sm={6} xl={3}><MetricCard label="Today's production" value={formatNumber(today.productionQuantity)} helper={`${formatNumber(today.cementUsed)} cement bags`} icon={PrecisionManufacturingRoundedIcon} tone="secondary" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><MetricCard label="Brick stock" value={formatNumber(inventory.bricks)} helper="Available for invoicing" icon={Inventory2RoundedIcon} tone="info" /></Grid>
        <Grid item xs={12} sm={6} xl={3}><MetricCard label="Month collections" value={formatCurrency(month.amountReceived)} helper={`${formatCurrency(month.outstandingAmount)} pending`} icon={TrendingUpRoundedIcon} tone="success" /></Grid>
      </Grid>

      <Grid container spacing={2.25} sx={{ mt: 0.1 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2.5 }}>
                <Box><Typography variant="h6">14-day production and sales</Typography><Typography variant="body2" color="text.secondary">Based on daily summary documents.</Typography></Box>
                <Button size="small" onClick={() => navigate('/reports')}>Open reports</Button>
              </Stack>
              <Box sx={{ width: '100%', height: 310 }}>
                <ResponsiveContainer>
                  <AreaChart data={data.trend || []} margin={{ left: -20, right: 8 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A84F32" stopOpacity={0.35}/><stop offset="95%" stopColor="#A84F32" stopOpacity={0}/></linearGradient>
                      <linearGradient id="productionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2F6C62" stopOpacity={0.3}/><stop offset="95%" stopColor="#2F6C62" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value, name) => [formatNumber(value), name === 'productionQuantity' ? 'Production' : 'Sales amount']} />
                    <Area type="monotone" dataKey="productionQuantity" stroke="#2F6C62" fill="url(#productionFill)" strokeWidth={2.4} />
                    <Area type="monotone" dataKey="salesAmount" stroke="#A84F32" fill="url(#salesFill)" strokeWidth={2.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Typography variant="h6">Recent activity</Typography>
              <Typography variant="body2" color="text.secondary">Latest five sales and production records.</Typography>
              {recent.length ? (
                <List disablePadding sx={{ mt: 1.5 }}>
                  {recent.map((item) => (
                    <ListItem key={item.id} disableGutters divider sx={{ py: 1.25 }}>
                      <ListItemText primary={item.title} secondary={`${item.type} · ${item.date} · ${item.subtitle}`} primaryTypographyProps={{ fontWeight: 700 }} secondaryTypographyProps={{ fontSize: '.76rem' }} />
                    </ListItem>
                  ))}
                </List>
              ) : <EmptyState title="No activity yet" description="Production and sales entries will appear here." />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2.25 }}>
        <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
          <Typography variant="h6">Quick actions</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<PrecisionManufacturingRoundedIcon />} onClick={() => navigate('/production')}>Record production</Button>
            <Button variant="outlined" startIcon={<AddBusinessRoundedIcon />} onClick={() => navigate('/inventory')}>Record purchase</Button>
            <Button variant="outlined" startIcon={<ReceiptLongRoundedIcon />} onClick={() => navigate('/sales')}>Create invoice</Button>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
};

export default DashboardPage;
