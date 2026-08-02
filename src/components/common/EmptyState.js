import React from 'react';
import { Box, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

const EmptyState = ({ title = 'No records found', description = 'Try changing the filters or add a new record.' }) => (
  <Box sx={{ py: 7, textAlign: 'center' }}>
    <InboxRoundedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
    <Typography variant="h6" sx={{ mt: 1 }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>
  </Box>
);

export default EmptyState;
