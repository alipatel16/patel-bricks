import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import { useAuth } from '../../context/AuthContext';

const Header = ({ onMenuClick, online }) => {
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #E8E2D9', backdropFilter: 'blur(18px)', bgcolor: 'rgba(245,242,236,.88)' }}>
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, px: { xs: 1.5, sm: 3 } }}>
        <IconButton onClick={onMenuClick} sx={{ display: { lg: 'none' }, mr: 1 }}><MenuRoundedIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</Typography>
          <Typography variant="h6" sx={{ textTransform: 'capitalize', lineHeight: 1.15 }}>{displayName}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            icon={online ? <CloudDoneRoundedIcon /> : <CloudOffRoundedIcon />}
            label={online ? 'Online' : 'Offline'}
            color={online ? 'success' : 'warning'}
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          />
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'secondary.main', fontWeight: 800 }}>{displayName[0]?.toUpperCase()}</Avatar>
          <Tooltip title="Sign out"><IconButton onClick={logout}><LogoutRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
