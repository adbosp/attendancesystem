import { Box, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import NotificationProvider from '../notifications/NotificationContext.jsx';

function MainLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setDesktopOpen((open) => !open);
      return;
    }

    setMobileOpen((open) => !open);
  };

  const handleCloseSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <NotificationProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header onMenuClick={handleToggleSidebar} sidebarOpen={isDesktop && desktopOpen} />
        <Sidebar
          desktopOpen={desktopOpen}
          mobileOpen={mobileOpen}
          onClose={handleCloseSidebar}
          variant={isDesktop ? 'permanent' : 'temporary'}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            minHeight: '100vh',
            minWidth: 0,
          }}
        >
          <Toolbar />
          <Box
            sx={{
              width: '100%',
              px: { xs: 1.5, sm: 3, lg: 4 },
              py: { xs: 2, sm: 3, lg: 4 },
              maxWidth: 1440,
              mx: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Outlet />
            <Box sx={{ pt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Create by Truong-IT
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </NotificationProvider>
  );
}

export default MainLayout;
