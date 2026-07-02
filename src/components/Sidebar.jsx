import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import GroupsIcon from '@mui/icons-material/Groups';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { NavLink } from 'react-router-dom';

export const drawerWidth = 272;

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Employees', path: '/employees', icon: <GroupsIcon /> },
  { label: 'Attendance', path: '/attendance', icon: <AccessTimeIcon /> },
  { label: 'Devices', path: '/devices', icon: <DevicesIcon /> },
  { label: 'Shifts', path: '/shifts', icon: <WorkHistoryIcon /> },
  { label: 'Departments', path: '/departments', icon: <ApartmentIcon /> },
  { label: 'Reports', path: '/reports', icon: <InsertChartOutlinedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

function SidebarContent({ onClose }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 3 }}>
        <Box>
          <Typography variant="h6">AMS</Typography>
          <Typography variant="caption" color="text.secondary">
            Basic Setup
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              sx={{
                minHeight: 46,
                borderRadius: 1,
                color: 'text.secondary',
                '& .MuiListItemIcon-root': {
                  color: 'inherit',
                  minWidth: 42,
                },
                '&.active': {
                  color: 'primary.main',
                  bgcolor: 'primary.50',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                },
                '&.active .MuiListItemText-primary': {
                  fontWeight: 700,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 'auto', px: 3, py: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary" display="block">
          System Info
        </Typography>
        <Typography variant="body2" fontWeight={700} color="primary.main">
          Create by Truong-IT
        </Typography>
      </Box>
    </Box>
  );
}

function Sidebar({ desktopOpen, mobileOpen, onClose, variant }) {
  const isTemporary = variant === 'temporary';

  if (!isTemporary && !desktopOpen) {
    return null;
  }

  return (
    <Drawer
      variant={variant}
      open={isTemporary ? mobileOpen : true}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: { lg: drawerWidth },
        flexShrink: 0,
        display: { xs: isTemporary ? 'block' : 'none', lg: isTemporary ? 'none' : 'block' },
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <SidebarContent onClose={isTemporary ? onClose : undefined} />
    </Drawer>
  );
}

export default Sidebar;
