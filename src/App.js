import React, { Suspense, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import AppShell from './components/layout/AppShell';
import LoadingState from './components/common/LoadingState';
import { initializeDatabase } from './services/appService';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ProductionPage = React.lazy(() => import('./pages/ProductionPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const SalesPage = React.lazy(() => import('./pages/SalesPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const GstReportsPage = React.lazy(() => import('./pages/GstReportsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

const App = () => {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setReady(false);
      return;
    }
    let active = true;
    initializeDatabase().then((result) => {
      if (!active) return;
      if (!result.success) setError(result.error);
      else if (result.data?.migrationWarning) setError(`Legacy migration warning: ${result.data.migrationWarning}`);
      setReady(true);
    });
    return () => { active = false; };
  }, [user]);

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (!user) return <LoginPage />;
  if (!ready) return <LoadingState minHeight="100vh" label="Preparing your Firestore workspace…" />;

  return (
    <AppShell>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/gst-reports" element={<GstReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
};

export default App;
