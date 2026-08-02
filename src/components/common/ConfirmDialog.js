import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

const ConfirmDialog = ({ open, title, description, confirmLabel = 'Delete', busy = false, onClose, onConfirm }) => (
  <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent><Typography color="text.secondary">{description}</Typography></DialogContent>
    <DialogActions sx={{ p: 2.5 }}>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
