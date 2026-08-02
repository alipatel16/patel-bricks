import { alpha, createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#A84F32',
      light: '#D88969',
      dark: '#71301F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2F6C62',
      light: '#75A69C',
      dark: '#1E4A43',
      contrastText: '#FFFFFF',
    },
    success: { main: '#34785E' },
    warning: { main: '#C98728' },
    error: { main: '#BC4B4B' },
    info: { main: '#477590' },
    background: {
      default: '#F5F2EC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#202B2A',
      secondary: '#687371',
    },
    divider: '#E8E2D9',
  },
  typography: {
    fontFamily: '"Elms Sans", "Inter", "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.04em' },
    h2: { fontWeight: 700, letterSpacing: '-0.035em' },
    h3: { fontWeight: 700, letterSpacing: '-0.03em' },
    h4: { fontWeight: 700, letterSpacing: '-0.025em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.015em' },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 16 },
  shadows: [
    'none',
    '0 4px 14px rgba(31, 42, 42, 0.05)',
    '0 8px 22px rgba(31, 42, 42, 0.06)',
    '0 12px 30px rgba(31, 42, 42, 0.07)',
    '0 18px 45px rgba(31, 42, 42, 0.08)',
    ...Array(20).fill('0 18px 45px rgba(31, 42, 42, 0.08)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minHeight: '100vh' },
        '*': { boxSizing: 'border-box' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, minHeight: 42, paddingInline: 18 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #ECE6DD',
          boxShadow: '0 12px 34px rgba(31, 42, 42, 0.06)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8AFA3' },
          '&.Mui-focused': {
            boxShadow: `0 0 0 4px ${alpha('#A84F32', 0.1)}`,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 22, border: '1px solid #ECE6DD' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#4D5957',
          backgroundColor: '#FAF8F4',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
});
