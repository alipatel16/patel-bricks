import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import { useAuth } from '../../context/AuthContext';

const friendlyError = (error) => {
  const code = error?.code || '';
  if (code.includes('invalid-credential')) return 'The email or password is incorrect.';
  if (code.includes('email-already-in-use')) return 'An account already exists for this email.';
  if (code.includes('weak-password')) return 'Use a password with at least six characters.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  return error?.message || 'Unable to continue.';
};

const LoginPage = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') await signUp(values.name, values.email, values.password);
      else await signIn(values.email, values.password);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!values.email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPassword(values.email);
      setMessage('Password reset instructions have been sent.');
    } catch (resetError) {
      setError(friendlyError(resetError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 1080, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: 3, alignItems: 'stretch' }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            minHeight: 620,
            borderRadius: 6,
            p: 6,
            color: 'white',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(145deg, #71301F 0%, #A84F32 48%, #2F6C62 140%)',
            boxShadow: '0 30px 80px rgba(82, 48, 36, 0.24)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 46, height: 46, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.15)' }}>
              <GridViewRoundedIcon />
            </Box>
            <Typography variant="h5">Patel Bricks</Typography>
          </Stack>
          <Box>
            <Typography variant="h2" sx={{ fontSize: '3.8rem', lineHeight: 1.02, mb: 3 }}>
              Production clarity, from kiln to customer.
            </Typography>
            <Typography sx={{ maxWidth: 520, opacity: 0.82, fontSize: '1.08rem' }}>
              A precise, mobile-ready workspace for production, inventory, invoices, collections, suppliers and GST reporting.
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>Firestore edition · Optimized for controlled reads</Typography>
        </Box>

        <Card sx={{ alignSelf: 'center', borderRadius: 5, overflow: 'visible' }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Stack spacing={3} component="form" onSubmit={submit}>
              <Box>
                <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 4 }}>
                  <GridViewRoundedIcon color="primary" />
                  <Typography variant="h6">Patel Bricks</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Typography>
                <Typography color="text.secondary">Sign in to Brick Production Manager.</Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}
              {mode === 'signup' && (
                <TextField label="Full name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required />
              )}
              <TextField label="Email address" type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} required />
              <TextField label="Password" type="password" value={values.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} required inputProps={{ minLength: 6 }} />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? <CircularProgress size={22} color="inherit" /> : mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
              {mode === 'login' && <Button onClick={handleReset} disabled={busy}>Forgot password?</Button>}
              <Divider />
              <Button variant="outlined" onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(''); }}>
                {mode === 'login' ? 'Create an internal account' : 'Already have an account? Sign in'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default LoginPage;
