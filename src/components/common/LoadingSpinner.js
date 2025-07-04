import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  useTheme,
} from '@mui/material';

function LoadingSpinner({ 
  loading = true, 
  message = 'Loading...', 
  size = 40, 
  backdrop = false,
  overlay = false,
  color = 'primary',
  fullscreen = false 
}) {
  const theme = useTheme();

  if (!loading) return null;

  const spinnerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  // Full screen loading
  if (fullscreen) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: theme.zIndex.modal + 1,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
        open={loading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={60} color={color} />
          {message && (
            <Typography variant="h6" color="textPrimary">
              {message}
            </Typography>
          )}
        </Box>
      </Backdrop>
    );
  }

  // Backdrop loading
  if (backdrop) {
    return (
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        open={loading}
      >
        {spinnerContent}
      </Backdrop>
    );
  }

  // Overlay loading (positioned absolutely within parent)
  if (overlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: theme.zIndex.tooltip,
          borderRadius: 'inherit',
        }}
      >
        {spinnerContent}
      </Box>
    );
  }

  // Default inline loading
  return spinnerContent;
}

// Preset loading components for common use cases
export const PageLoader = ({ loading, message = 'Loading page...' }) => (
  <LoadingSpinner 
    loading={loading} 
    message={message} 
    size={50} 
    fullscreen 
  />
);

export const CardLoader = ({ loading, message = 'Loading...' }) => (
  <LoadingSpinner 
    loading={loading} 
    message={message} 
    size={30} 
    overlay 
  />
);

export const ButtonLoader = ({ loading, size = 20 }) => (
  <CircularProgress 
    size={size} 
    color="inherit"
    sx={{ display: loading ? 'inline-block' : 'none' }}
  />
);

export const TableLoader = ({ loading, message = 'Loading data...', rows = 5 }) => {
  if (!loading) return null;

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
      {/* Skeleton rows could be added here */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Box
            key={index}
            sx={{
              height: 40,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              opacity: 0.6 - (index * 0.1),
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export const InlineLoader = ({ loading, message, size = 16 }) => {
  if (!loading) return null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        ml: 1,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="caption" color="textSecondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;