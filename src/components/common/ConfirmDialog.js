import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

function ConfirmDialog({
  open = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  type = 'default', // 'default', 'warning', 'error', 'delete', 'info', 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showIcon = true,
  details = null, // Array of detail items or single string
  severity = 'medium', // 'low', 'medium', 'high'
  loading = false,
  disabled = false,
  maxWidth = 'sm',
  fullWidth = true,
  showCancel = true,
  autoFocus = 'cancel', // 'confirm', 'cancel', or 'none'
  ...other
}) {
  const [processing, setProcessing] = useState(false);

  // Get configuration based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <WarningIcon />,
          iconColor: 'warning.main',
          confirmColor: 'warning',
          title: title || 'Warning',
        };
      case 'error':
        return {
          icon: <ErrorIcon />,
          iconColor: 'error.main',
          confirmColor: 'error',
          title: title || 'Error',
        };
      case 'delete':
        return {
          icon: <DeleteIcon />,
          iconColor: 'error.main',
          confirmColor: 'error',
          confirmText: confirmText || 'Delete',
          title: title || 'Delete Item',
        };
      case 'info':
        return {
          icon: <InfoIcon />,
          iconColor: 'info.main',
          confirmColor: 'info',
          title: title || 'Information',
        };
      case 'success':
        return {
          icon: <CheckCircleIcon />,
          iconColor: 'success.main',
          confirmColor: 'success',
          title: title || 'Success',
        };
      default:
        return {
          icon: <InfoIcon />,
          iconColor: 'primary.main',
          confirmColor: 'primary',
          title: title || 'Confirm Action',
        };
    }
  };

  const config = getTypeConfig();

  // Handle confirm with loading state
  const handleConfirm = async () => {
    if (!onConfirm) return;

    try {
      setProcessing(true);
      await onConfirm();
    } catch (error) {
      
    } finally {
      setProcessing(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (processing || loading) return;
    if (onClose) onClose();
  };

  // Get severity styling
  const getSeverityStyle = () => {
    const styles = {
      low: { borderLeft: '4px solid', borderLeftColor: 'info.main' },
      medium: { borderLeft: '4px solid', borderLeftColor: 'warning.main' },
      high: { borderLeft: '4px solid', borderLeftColor: 'error.main' },
    };
    return styles[severity] || styles.medium;
  };

  const isLoading = loading || processing;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableEscapeKeyDown={isLoading}
      {...other}
    >
      {/* Title */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showIcon && (
            <Box sx={{ color: config.iconColor, display: 'flex' }}>
              {config.icon}
            </Box>
          )}
          <Typography variant="h6" component="span">
            {config.title}
          </Typography>
        </Box>

        <IconButton
          onClick={handleClose}
          size="small"
          disabled={isLoading}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent>
        {/* Main message */}
        <Box sx={{ ...getSeverityStyle(), pl: 2, py: 1, mb: 2 }}>
          <DialogContentText sx={{ fontSize: '1rem', color: 'text.primary' }}>
            {message}
          </DialogContentText>
        </Box>

        {/* Details section */}
        {details && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Details:
            </Typography>
            
            {Array.isArray(details) ? (
              <List dense sx={{ py: 0 }}>
                {details.map((detail, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    {detail.icon && (
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {detail.icon}
                      </ListItemIcon>
                    )}
                    <ListItemText
                      primary={detail.primary || detail}
                      secondary={detail.secondary}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    {detail.value && (
                      <Chip
                        label={detail.value}
                        size="small"
                        variant="outlined"
                        color={detail.valueColor || 'default'}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                {details}
              </Typography>
            )}
          </Box>
        )}

        {/* Warning for high severity actions */}
        {severity === 'high' && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'error.light',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'error.main',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.dark' }}>
              ⚠️ This action cannot be undone
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {showCancel && (
          <Button
            onClick={handleClose}
            color="inherit"
            variant="outlined"
            disabled={isLoading}
            startIcon={<CancelIcon />}
          >
            {cancelText}
          </Button>
        )}
        
        <Button
          onClick={handleConfirm}
          color={config.confirmColor}
          variant="contained"
          disabled={disabled || isLoading}
          autoFocus={autoFocus === 'confirm'}
          startIcon={
            isLoading ? null : 
            type === 'delete' ? <DeleteIcon /> :
            type === 'success' ? <SaveIcon /> :
            <CheckCircleIcon />
          }
        >
          {isLoading ? 'Processing...' : (config.confirmText || confirmText)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Preset confirm dialogs for common use cases
export const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  additionalInfo,
  ...props
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type="delete"
    title={`Delete ${itemType}`}
    message={`Are you sure you want to delete ${itemName ? `"${itemName}"` : `this ${itemType}`}?`}
    details={additionalInfo ? [
      { primary: 'Item to delete:', value: itemName },
      { primary: 'Additional info:', secondary: additionalInfo },
    ] : null}
    severity="high"
    confirmText="Delete"
    {...props}
  />
);

export const SaveConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  hasChanges = true,
  unsavedChanges = [],
  ...props
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type="warning"
    title="Save Changes"
    message="You have unsaved changes. Do you want to save them?"
    details={unsavedChanges.length > 0 ? unsavedChanges.map(change => ({
      primary: change,
      icon: <EditIcon fontSize="small" />,
    })) : null}
    severity="medium"
    confirmText="Save Changes"
    cancelText="Discard Changes"
    {...props}
  />
);

export const LogoutConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  ...props
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type="warning"
    title="Sign Out"
    message="Are you sure you want to sign out?"
    details="You will need to sign in again to access your account."
    severity="low"
    confirmText="Sign Out"
    {...props}
  />
);

export const ResetConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  resetType = 'settings',
  ...props
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type="warning"
    title={`Reset ${resetType}`}
    message={`Are you sure you want to reset all ${resetType} to their default values?`}
    details="This action cannot be undone."
    severity="high"
    confirmText="Reset"
    {...props}
  />
);

export const ClearDataConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  dataType = 'data',
  count,
  ...props
}) => (
  <ConfirmDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type="error"
    title={`Clear ${dataType}`}
    message={`Are you sure you want to clear all ${dataType}?`}
    details={[
      { primary: 'Data type:', value: dataType },
      ...(count ? [{ primary: 'Items to clear:', value: count.toString() }] : []),
      { primary: 'Warning:', secondary: 'This action cannot be undone' },
    ]}
    severity="high"
    confirmText="Clear Data"
    {...props}
  />
);

export default ConfirmDialog;