import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  IconButton,
  Typography,
  Box,
  Slide,
  Fade,
  Zoom,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Help as QuestionIcon,
} from '@mui/icons-material';

// Transition components
const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const FadeTransition = React.forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />;
});

const ZoomTransition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

function Modal({
  open = false,
  onClose,
  onConfirm,
  onCancel,
  title,
  children,
  content,
  type = 'default', // 'default', 'confirm', 'alert', 'warning', 'error', 'success', 'info'
  size = 'sm', // 'xs', 'sm', 'md', 'lg', 'xl'
  transition = 'fade', // 'fade', 'slide', 'zoom'
  showCloseButton = true,
  showActions = true,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  confirmVariant = 'contained',
  cancelColor = 'inherit',
  cancelVariant = 'text',
  disableConfirm = false,
  disableCancel = false,
  loading = false,
  fullScreen = false,
  persistent = false, // Prevent closing by clicking outside
  actions,
  maxWidth = 'sm',
  ...other
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Auto full screen on mobile for larger modals
  const isFullScreen = fullScreen || (isMobile && ['md', 'lg', 'xl'].includes(size));

  // Select transition component
  const getTransitionComponent = () => {
    switch (transition) {
      case 'slide':
        return SlideTransition;
      case 'zoom':
        return ZoomTransition;
      default:
        return FadeTransition;
    }
  };

  // Get icon for modal type
  const getTypeIcon = () => {
    const iconProps = { sx: { fontSize: 24, mr: 1 } };
    
    switch (type) {
      case 'warning':
        return <WarningIcon color="warning" {...iconProps} />;
      case 'error':
        return <ErrorIcon color="error" {...iconProps} />;
      case 'success':
        return <SuccessIcon color="success" {...iconProps} />;
      case 'info':
        return <InfoIcon color="info" {...iconProps} />;
      case 'confirm':
        return <QuestionIcon color="primary" {...iconProps} />;
      default:
        return null;
    }
  };

  // Get color scheme for modal type
  const getTypeColors = () => {
    switch (type) {
      case 'warning':
        return { confirmColor: 'warning', cancelColor: 'inherit' };
      case 'error':
        return { confirmColor: 'error', cancelColor: 'inherit' };
      case 'success':
        return { confirmColor: 'success', cancelColor: 'inherit' };
      case 'info':
        return { confirmColor: 'info', cancelColor: 'inherit' };
      default:
        return { confirmColor: confirmColor || 'primary', cancelColor: cancelColor || 'inherit' };
    }
  };

  const typeColors = getTypeColors();

  // Handle close
  const handleClose = (event, reason) => {
    if (persistent && reason === 'backdropClick') {
      return;
    }
    if (onClose) onClose();
  };

  // Handle confirm
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  // Default actions based on type
  const getDefaultActions = () => {
    if (actions) return actions;

    switch (type) {
      case 'alert':
      case 'info':
      case 'success':
      case 'error':
        return (
          <Button 
            onClick={handleCancel} 
            color={typeColors.cancelColor}
            variant={cancelVariant}
            disabled={disableCancel || loading}
          >
            OK
          </Button>
        );
      
      case 'confirm':
      case 'warning':
        return (
          <>
            <Button 
              onClick={handleCancel} 
              color={typeColors.cancelColor}
              variant={cancelVariant}
              disabled={disableCancel || loading}
            >
              {cancelText}
            </Button>
            <Button 
              onClick={handleConfirm} 
              color={typeColors.confirmColor}
              variant={confirmVariant}
              disabled={disableConfirm || loading}
              autoFocus
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </>
        );
      
      default:
        if (onConfirm) {
          return (
            <>
              <Button 
                onClick={handleCancel} 
                color={typeColors.cancelColor}
                variant={cancelVariant}
                disabled={disableCancel || loading}
              >
                {cancelText}
              </Button>
              <Button 
                onClick={handleConfirm} 
                color={typeColors.confirmColor}
                variant={confirmVariant}
                disabled={disableConfirm || loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            </>
          );
        }
        return (
          <Button 
            onClick={handleCancel} 
            color={typeColors.cancelColor}
            variant={cancelVariant}
            disabled={disableCancel || loading}
          >
            Close
          </Button>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={isFullScreen}
      TransitionComponent={getTransitionComponent()}
      disableEscapeKeyDown={persistent}
      {...other}
    >
      {/* Title */}
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getTypeIcon()}
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          
          {showCloseButton && (
            <IconButton
              onClick={handleClose}
              size="small"
              disabled={loading}
              sx={{ 
                color: 'grey.500',
                '&:hover': { color: 'grey.700' }
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent sx={{ py: title ? 2 : 3 }}>
        {content && (
          <DialogContentText sx={{ mb: 2 }}>
            {content}
          </DialogContentText>
        )}
        {children}
      </DialogContent>

      {/* Actions */}
      {showActions && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {getDefaultActions()}
        </DialogActions>
      )}
    </Dialog>
  );
}

// Preset modal components for common use cases
export const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title={title}
    content={message}
    type="confirm"
    confirmText={confirmText}
    cancelText={cancelText}
    {...props}
  />
);

export const AlertModal = ({ 
  open, 
  onClose, 
  title = 'Alert', 
  message, 
  type = 'info',
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    content={message}
    type={type}
    showActions={true}
    {...props}
  />
);

export const DeleteModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Delete Item', 
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title={title}
    content={itemName ? `${message}\n\nItem: ${itemName}` : message}
    type="error"
    confirmText="Delete"
    cancelText="Cancel"
    confirmColor="error"
    {...props}
  />
);

export const InfoModal = ({ 
  open, 
  onClose, 
  title = 'Information', 
  message,
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    content={message}
    type="info"
    showActions={true}
    {...props}
  />
);

export const ErrorModal = ({ 
  open, 
  onClose, 
  title = 'Error', 
  message,
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    content={message}
    type="error"
    showActions={true}
    {...props}
  />
);

export const SuccessModal = ({ 
  open, 
  onClose, 
  title = 'Success', 
  message,
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    content={message}
    type="success"
    showActions={true}
    {...props}
  />
);

export const WarningModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Warning', 
  message,
  confirmText = 'Continue',
  ...props 
}) => (
  <Modal
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title={title}
    content={message}
    type="warning"
    confirmText={confirmText}
    {...props}
  />
);

export default Modal;