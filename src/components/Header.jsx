import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser } from '../auth/auth.js';
import { useNotifications } from '../notifications/NotificationContext.jsx';
import { useAppPreferences } from '../preferences/AppPreferencesContext.jsx';
import { drawerWidth } from './Sidebar.jsx';

const headerText = {
  en: {
    title: 'Attendance Management System',
    subtitle: 'Admin Dashboard',
    notifications: 'Notifications',
    markRead: 'Mark read',
    noNotifications: 'No notifications right now.',
    unread: 'unread',
    themeTooltip: 'Toggle dark/light theme',
    languageLabel: 'Language',
    logout: 'logout',
  },
  vi: {
    title: 'Hệ Thống Quản Lý Chấm Công',
    subtitle: 'Bảng điều khiển quản trị',
    notifications: 'Thông báo',
    markRead: 'Đã đọc',
    noNotifications: 'Hiện không có thông báo.',
    unread: 'Chưa đọc',
    themeTooltip: 'Giao Diện Tối/Sáng',
    languageLabel: 'Ngôn ngữ',
    logout: 'Đăng xuất',
  },
};

function Header({ onMenuClick, sidebarOpen }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { language, setLanguage, themeMode, toggleThemeMode } = useAppPreferences();
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const text = headerText[language] || headerText.en;

  const handleLogout = () => {
    clearStoredUser();
    navigate('/login', { replace: true });
  };

  const handleOpenNotifications = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationAnchor(null);
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        width: { lg: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
        ml: { lg: sidebarOpen ? `${drawerWidth}px` : 0 },
        bgcolor: 'background.paper',
        transition: (theme) =>
          theme.transitions.create(['margin-left', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          aria-label="toggle sidebar"
          edge="start"
          onClick={onMenuClick}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h6" noWrap>
            {text.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {text.subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75 }}>
          <TranslateIcon fontSize="small" color="action" />
          <ButtonGroup size="small" aria-label={text.languageLabel}>
            <Button
              variant={language === 'vi' ? 'contained' : 'outlined'}
              onClick={() => setLanguage('vi')}
            >
              VI
            </Button>
            <Button
              variant={language === 'en' ? 'contained' : 'outlined'}
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
          </ButtonGroup>
        </Box>
        <Tooltip title={text.themeTooltip}>
          <IconButton aria-label={text.themeTooltip} onClick={toggleThemeMode}>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        <IconButton aria-label="notifications" onClick={handleOpenNotifications}>
          <Badge color="error" badgeContent={unreadCount}>
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
        <Popover
          open={Boolean(notificationAnchor)}
          anchorEl={notificationAnchor}
          onClose={handleCloseNotifications}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ width: 360, maxWidth: '90vw', p: 2 }}>
            <NotificationPanel
              markAllRead={markAllRead}
              notifications={notifications}
              text={text}
              unreadCount={unreadCount}
            />
          </Box>
        </Popover>
        <IconButton aria-label={text.logout} onClick={handleLogout}>
          <LogoutIcon />
        </IconButton>
        <Avatar
          alt={user?.name || 'Admin User'}
          sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700 }}
        >
          {(user?.name || 'A').charAt(0).toUpperCase()}
        </Avatar>
      </Toolbar>
    </AppBar>
  );
}

function NotificationPanel({ notifications, unreadCount, markAllRead, text }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="h6">{text.notifications}</Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} {text.unread}
          </Typography>
        </Box>
        <Button size="small" onClick={markAllRead} disabled={notifications.length === 0}>
          {text.markRead}
        </Button>
      </Box>
      {notifications.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {text.noNotifications}
        </Typography>
      ) : (
        <List disablePadding sx={{ maxHeight: 420, overflow: 'auto' }}>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              alignItems="flex-start"
              disableGutters
              sx={{
                py: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {notification.title}
                    </Typography>
                    <Chip
                      size="small"
                      color={notification.severity === 'error' ? 'error' : notification.severity === 'warning' ? 'warning' : 'success'}
                      label={notification.time}
                    />
                  </Box>
                }
                secondary={notification.message}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default Header;
