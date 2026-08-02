import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

const PageHeader = ({ eyebrow, title, description, action }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={2} sx={{ mb: 3 }}>
    <Box>
      {eyebrow && <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: '.12em' }}>{eyebrow}</Typography>}
      <Typography variant="h4" sx={{ fontSize: { xs: '1.8rem', md: '2.25rem' } }}>{title}</Typography>
      {description && <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>{description}</Typography>}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Stack>
);

export default PageHeader;
