import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingState = ({ label = 'Loading data…', minHeight = 220 }) => (
  <Box sx={{ minHeight, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
    <Box>
      <CircularProgress size={32} />
      <Typography color="text.secondary" sx={{ mt: 1.5 }}>{label}</Typography>
    </Box>
  </Box>
);

export default LoadingState;
