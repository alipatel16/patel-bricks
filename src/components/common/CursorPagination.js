import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const CursorPagination = ({ page, hasMore, loading, onPrevious, onNext }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 2 }}>
    <Button startIcon={<ArrowBackRoundedIcon />} disabled={loading || page <= 1} onClick={onPrevious}>Previous</Button>
    <Typography variant="body2" color="text.secondary">Page {page}</Typography>
    <Button endIcon={<ArrowForwardRoundedIcon />} disabled={loading || !hasMore} onClick={onNext}>Next</Button>
  </Stack>
);

export default CursorPagination;
