import React, { useEffect, useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Toolbar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Factory as FactoryIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

// Import contexts
import { useApp } from "../../context/AppContext";
import { useInventory } from "../../context/InventoryContext";

// Import constants
import { APP_NAME, MENU_ITEMS } from "../../utils/constants";
import { productionService } from "../../services/productionService";
import { salesService } from "../../services/salesService";

const DRAWER_WIDTH = 240;

// Icon mapping
const iconMap = {
  Dashboard: DashboardIcon,
  Factory: FactoryIcon,
  Inventory: InventoryIcon,
  ShoppingCart: ShoppingCartIcon,
  Assessment: AssessmentIcon,
  Settings: SettingsIcon,
};

function Sidebar({ open, onToggle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { actions: appActions } = useApp();
  const { lowStockAlerts, cement } = useInventory();

  const [calculatedBrickStock, setCalculatedBrickStock] = useState(0);
  const [stockLoading, setStockLoading] = useState(true);

  const loadCalculatedStock = async () => {
    try {
      setStockLoading(true);
      const result = await calculateActualBrickStock();

      if (result.success) {
        setCalculatedBrickStock(result.data.calculated_stock);
        console.log(
          "Sidebar: Calculated stock loaded:",
          result.data.calculated_stock
        );
      } else {
        console.error("Sidebar: Failed to calculate stock");
        setCalculatedBrickStock(0);
      }
    } catch (error) {
      console.error("Sidebar: Error loading calculated stock:", error);
      setCalculatedBrickStock(0);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadCalculatedStock();
  }, []);

  // Handle navigation
  const handleNavigation = (path, id) => {
    navigate(path);
    appActions.setCurrentPage(id);

    // Close sidebar on mobile after navigation
    if (isMobile && open) {
      onToggle();
    }
  };

  // Check if menu item is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Get alert count for inventory
  const getInventoryAlerts = () => {
    let count = 0;
    if (lowStockAlerts?.bricks) count++;
    if (lowStockAlerts?.cement) count++;
    return count;
  };

  const calculateActualBrickStock = async () => {
    try {
      // ✅ Use the same service methods as Dashboard.js
      const [productionResult, salesResult] = await Promise.all([
        productionService.getProductionHistory(1000),
        salesService.getAllSales(),
      ]);

      // Calculate total production
      let totalProduction = 0;
      if (productionResult.success && productionResult.data) {
        totalProduction = productionResult.data.reduce((sum, production) => {
          return sum + (parseInt(production.quantity) || 0);
        }, 0);
      }

      // Calculate total sales
      let totalSales = 0;
      if (salesResult.success && salesResult.data) {
        totalSales = salesResult.data.reduce((sum, sale) => {
          return sum + (parseInt(sale.quantity) || 0);
        }, 0);
      }

      const actualBrickStock = totalProduction - totalSales;

      return {
        success: true,
        data: { calculated_stock: actualBrickStock },
      };
    } catch (error) {
      console.error("Sidebar: Error calculating brick stock:", error);
      return { success: false, data: { calculated_stock: 0 } };
    }
  };

  // Render menu item with potential alerts
  const renderMenuItem = (item) => {
    const IconComponent = iconMap[item.icon] || DashboardIcon;
    const isItemActive = isActive(item.path);
    const alerts = item.id === "inventory" ? getInventoryAlerts() : 0;

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          onClick={() => handleNavigation(item.path, item.id)}
          selected={isItemActive}
          sx={{
            mx: 1,
            borderRadius: 2,
            mb: 0.5,
            "&.Mui-selected": {
              backgroundColor: theme.palette.primary.main,
              color: "white",
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
              "& .MuiListItemIcon-root": {
                color: "white",
              },
            },
            "&:hover": {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: isItemActive ? "white" : theme.palette.text.secondary,
              minWidth: 40,
            }}
          >
            <IconComponent />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{
              color: isItemActive ? "white" : theme.palette.text.primary,
            }}
          />
          {alerts > 0 && (
            <Chip label={alerts} size="small" color="error" sx={{ ml: 1 }} />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sidebar Header with hamburger menu */}
      <Toolbar
        sx={{
          px: 2,
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          minHeight: "64px !important",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* App branding */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FactoryIcon sx={{ fontSize: 28 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 600, fontSize: "1.1rem" }}
          >
            {APP_NAME.split(" ")[0]}
          </Typography>
        </Box>

        {/* Hamburger menu button */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          onClick={onToggle}
          edge="end"
          sx={{
            color: "white",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <Divider />

      {/* Quick Stats */}
      <Box
        sx={{ px: 2, py: 2, backgroundColor: theme.palette.background.paper }}
      >
        <Typography
          variant="overline"
          color="textSecondary"
          sx={{ fontWeight: 600, display: "block", mb: 1 }}
        >
          Quick Stats
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Bricks
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {stockLoading
                  ? "Loading..."
                  : calculatedBrickStock.toLocaleString()}
              </Typography>
              {lowStockAlerts?.bricks && (
                <WarningIcon color="error" sx={{ fontSize: 16 }} />
              )}
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Cement
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {cement?.total_bags?.toLocaleString() || "0"} bags
              </Typography>
              {lowStockAlerts?.cement && (
                <WarningIcon color="error" sx={{ fontSize: 16 }} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <Box sx={{ flexGrow: 1, py: 1 }}>
        <Typography
          variant="overline"
          color="textSecondary"
          sx={{ px: 2, fontWeight: 600, display: "block", mb: 1 }}
        >
          Navigation
        </Typography>
        <List sx={{ px: 1 }}>{MENU_ITEMS.map(renderMenuItem)}</List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <TrendingUpIcon color="success" sx={{ fontSize: 16 }} />
          <Typography variant="caption" color="textSecondary">
            System Status: Online
          </Typography>
        </Box>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ display: "block" }}
        >
          Last updated: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          transition: theme.transitions.create(["transform"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          transform: open ? "translateX(0)" : `translateX(-${DRAWER_WIDTH}px)`,
          position: "fixed",
          height: "100vh",
          zIndex: theme.zIndex.drawer,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;
