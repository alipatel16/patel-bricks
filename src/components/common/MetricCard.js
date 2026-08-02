import React from 'react';
import { alpha, Box, Card, CardContent, Stack, Typography } from '@mui/material';

const MetricCard = ({ label, value, helper, caption, icon: Icon, tone = 'primary' }) => {
  const supportingText = helper || caption;
  return (
    <Card sx={{ height: '100%', width: '100%' }}>
      <CardContent sx={{ p: 2.5, height: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ height: '100%' }}>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 750 }}>{label}</Typography>
            <Typography variant="h4" sx={{ mt: 1, fontSize: { xs: '1.55rem', lg: '1.9rem' }, lineHeight: 1.14, overflowWrap: 'anywhere' }}>{value}</Typography>
            {supportingText && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 'auto', pt: 1, lineHeight: 1.35 }}>{supportingText}</Typography>}
          </Box>
          {Icon && (
            <Box sx={(theme) => ({ width: 46, height: 46, borderRadius: 3, display: 'grid', placeItems: 'center', color: `${tone}.main`, bgcolor: alpha(theme.palette[tone]?.main || theme.palette.primary.main, 0.11), flexShrink: 0 })}>
              <Icon />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
