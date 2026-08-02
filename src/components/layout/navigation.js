import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

export const navigationItems = [
  { label: 'Dashboard', path: '/', icon: DashboardRoundedIcon, mobile: true },
  { label: 'Production', path: '/production', icon: PrecisionManufacturingRoundedIcon, mobile: true },
  { label: 'Inventory', path: '/inventory', icon: Inventory2RoundedIcon, mobile: true },
  { label: 'Sales', path: '/sales', icon: ReceiptLongRoundedIcon, mobile: true },
  { label: 'Customers', path: '/customers', icon: GroupsRoundedIcon },
  { label: 'Suppliers', path: '/suppliers', icon: LocalShippingRoundedIcon },
  { label: 'Reports', path: '/reports', icon: AssessmentRoundedIcon, mobile: true },
  { label: 'GST Reports', path: '/gst-reports', icon: AccountBalanceRoundedIcon },
  { label: 'Settings', path: '/settings', icon: SettingsRoundedIcon },
];
