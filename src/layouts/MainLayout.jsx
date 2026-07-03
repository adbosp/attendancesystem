import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  syncAttendanceFromDevices,
  syncEmployeesFromDevices,
  testBackendConnection,
} from '../api/api.js';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { NOTIFICATION_EVENT } from '../notifications/notificationSettings.js';
import NotificationProvider from '../notifications/NotificationContext.jsx';

function MainLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [startupSync, setStartupSync] = useState({
    loading: false,
    severity: 'default',
    message: '',
  });

  useEffect(() => {
    let isMounted = true;

    const dispatchSyncNotification = (detail) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
    };

    const runStartupSync = async () => {
      setStartupSync({
        loading: true,
        severity: 'info',
        message: 'Đang đồng bộ dữ liệu...',
      });

      try {
        await testBackendConnection();
        const [employeeResult, attendanceResult] = await Promise.allSettled([
          syncEmployeesFromDevices(),
          syncAttendanceFromDevices(),
        ]);

        const failedResults = [employeeResult, attendanceResult].filter(
          (result) => result.status === 'rejected',
        );

        if (failedResults.length > 0) {
          const message = 'Đã kết nối backend nhưng có dữ liệu thiết bị chưa đồng bộ được.';
          if (isMounted) {
            setStartupSync({
              loading: false,
              severity: 'warning',
              message,
            });
          }
          dispatchSyncNotification({
            type: 'syncAttendance',
            severity: 'warning',
            title: 'Startup sync partially completed',
            message,
          });
          return;
        }

        const employeeMessage = employeeResult.value?.message || 'Employees synced.';
        const attendanceMessage = attendanceResult.value?.message || 'Attendance logs synced.';
        const message = `${employeeMessage} ${attendanceMessage}`;

        if (isMounted) {
          setStartupSync({
            loading: false,
            severity: 'success',
            message: 'Đã tải dữ liệu mới',
          });
        }

        dispatchSyncNotification({
          type: 'syncAttendance',
          severity: 'success',
          title: 'Startup sync completed',
          message,
        });
      } catch (error) {
        const message = error.response?.data?.message || 'Không thể kết nối backend để đồng bộ dữ liệu.';
        if (isMounted) {
          setStartupSync({
            loading: false,
            severity: 'error',
            message,
          });
        }
        dispatchSyncNotification({
          type: 'syncAttendance',
          severity: 'error',
          title: 'Startup sync failed',
          message,
        });
      }
    };

    runStartupSync();

    return () => {
      isMounted = false;
    };
  }, []);

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
        <Header
          onMenuClick={handleToggleSidebar}
          sidebarOpen={isDesktop && desktopOpen}
          startupSync={startupSync}
        />
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
          </Box>
        </Box>
      </Box>
    </NotificationProvider>
  );
}

export default MainLayout;
