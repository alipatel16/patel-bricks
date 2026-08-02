import React from 'react';
import { Chip } from '@mui/material';

const colorFor = (status) => {
  const value = String(status || '').toLowerCase();
  if (['paid', 'active', 'completed', 'success', 'add'].includes(value)) return 'success';
  if (['partial', 'warning', 'pending'].includes(value)) return 'warning';
  if (['due', 'inactive', 'blocked', 'error', 'subtract'].includes(value)) return 'error';
  return 'default';
};

const StatusPill = ({ status, label }) => <Chip size="small" label={label || status || 'Unknown'} color={colorFor(status)} variant="outlined" />;
export default StatusPill;
