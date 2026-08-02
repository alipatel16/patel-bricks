import React from 'react';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationItems } from './navigation';

export const drawerWidth = 264;

const DrawerContent = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, py: 1.5 }}>
        <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 3, color: 'white', background: 'linear-gradient(145deg, #A84F32, #71301F)' }}>
          <GridViewRoundedIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.1 }}>Patel Bricks</Typography>
          <Typography variant="caption" color="text.secondary">Production Manager</Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <List sx={{ px: 0.5 }}>
        {navigationItems.map(({ label, path, icon: Icon }) => {
          const selected = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <ListItemButton
              key={path}
              selected={selected}
              onClick={() => { navigate(path); onNavigate?.(); }}
              sx={{ mb: 0.5, borderRadius: 2.5, minHeight: 46, '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(168,79,50,.10)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(168,79,50,.14)' } }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: selected ? 800 : 600, fontSize: '.92rem' }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 2, borderRadius: 3, bgcolor: '#F6F1EB' }}>
        <Typography variant="caption" color="text.secondary">Firestore optimized</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.4 }}>Reads happen only when needed.</Typography>
      </Box>
    </Box>
  );
};

const Sidebar = ({ mobileOpen, onMobileClose }) => (
  <>
    <Drawer
      variant="permanent"
      sx={{ display: { xs: 'none', lg: 'block' }, width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, borderRight: '1px solid #E8E2D9', bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(16px)' } }}
      open
    >
      <DrawerContent />
    </Drawer>
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onMobileClose}
      ModalProps={{ keepMounted: true }}
      sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
    >
      <DrawerContent onNavigate={onMobileClose} />
    </Drawer>
  </>
);

export default Sidebar;
