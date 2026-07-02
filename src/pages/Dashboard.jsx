import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DevicesIcon from '@mui/icons-material/Devices';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GroupsIcon from '@mui/icons-material/Groups';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { testBackendConnection } from '../api/api.js';
import DeviceStatusChip from '../components/DeviceStatusChip.jsx';
import useAttendance from '../hooks/useAttendance.js';
import useDepartments from '../hooks/useDepartments.js';
import useDevices from '../hooks/useDevices.js';
import useEmployees from '../hooks/useEmployees.js';

const today = new Date().toISOString().slice(0, 10);

function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const { devices, stats: deviceStats } = useDevices({ pollingInterval: 5000 });
  const { employees } = useEmployees({ pollingInterval: 5000 });
  const { departments, stats: departmentStats } = useDepartments({ pollingInterval: 5000 });
  const { logs, summary, stats: attendanceStats } = useAttendance({
    date: today,
    deviceId: 'all',
    pollingInterval: 5000,
  });
  const missingOutCount = summary.filter((row) => row.status === 'missing-out' || !row.out).length;
  const completeRows = summary.filter((row) => row.status !== 'missing-out' && row.out);
  const totalMinutes = completeRows.reduce((total, row) => total + Number(row.totalMinutes || 0), 0);
  const totalHours = `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
  const assignedEmployees = employees.filter((employee) => employee.departmentName).length;
  const lastSyncText = useMemo(() => {
    const syncDates = devices
      .map((device) => device.lastSyncedAt || device.lastTestedAt)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    if (syncDates.length === 0) {
      return 'Never';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(syncDates[0]);
  }, [devices]);
  const departmentOverview = useMemo(() => {
    const rows = departments.map((department) => ({
      id: department._id,
      name: department.departmentName,
      count: employees.filter((employee) => employee.departmentName === department.departmentName).length,
    }));
    const unassigned = employees.filter((employee) => !employee.departmentName).length;

    if (unassigned > 0) {
      rows.push({
        id: 'unassigned',
        name: 'Unassigned',
        count: unassigned,
      });
    }

    return rows.sort((a, b) => b.count - a.count);
  }, [departments, employees]);
  const recentSessions = summary.slice(-5).reverse();

  const statCards = [
    { label: 'Employees', value: `${employees.length}`, icon: <GroupsIcon />, color: '#2563eb' },
    {
      label: 'Attendance Today',
      value: `${attendanceStats.employees}`,
      icon: <AccessTimeIcon />,
      color: '#0f766e',
    },
    { label: 'Raw Events', value: `${logs.length}`, icon: <EventAvailableIcon />, color: '#d97706' },
    {
      label: 'Connected Devices',
      value: `${deviceStats.connected}/${deviceStats.total}`,
      icon: <DevicesIcon />,
      color: '#7c3aed',
    },
    { label: 'Missing OUT', value: `${missingOutCount}`, icon: <WarningAmberIcon />, color: '#dc2626' },
    { label: 'Work Hours Today', value: totalHours, icon: <AccessTimeIcon />, color: '#0891b2' },
    { label: 'Departments', value: `${departmentStats.active}/${departmentStats.total}`, icon: <ApartmentIcon />, color: '#16a34a' },
    { label: 'Last Sync', value: lastSyncText, icon: <SyncIcon />, color: '#475569' },
  ];

  useEffect(() => {
    let isMounted = true;

    testBackendConnection()
      .then(() => {
        if (isMounted) {
          setConnectionStatus('connected');
        }
      })
      .catch(() => {
        if (isMounted) {
          setConnectionStatus('failed');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Overview of the attendance management workspace.
        </Typography>
      </Box>

      {connectionStatus === 'checking' && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Checking backend connection...
        </Alert>
      )}
      {connectionStatus === 'connected' && (
        <Alert severity="success">Backend Connected</Alert>
      )}
      {connectionStatus === 'failed' && (
        <Alert severity="error">Cannot connect to server</Alert>
      )}

      <Grid container spacing={3}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      color: card.color,
                      bgcolor: `${card.color}17`,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Department Coverage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Employee grouping progress across departments.
                  </Typography>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2">Assigned employees</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {assignedEmployees}/{employees.length}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={employees.length ? (assignedEmployees / employees.length) * 100 : 0}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                <Stack spacing={1.25}>
                  {departmentOverview.map((department) => (
                    <Stack
                      key={department.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Typography variant="body2">{department.name}</Typography>
                      <Chip label={`${department.count}`} size="small" color={department.id === 'unassigned' ? 'default' : 'primary'} />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Device Health</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Live status of configured attendance devices.
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {devices.map((device) => (
                    <Stack
                      key={device._id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {device.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {device.ipAddress}:{device.port}
                        </Typography>
                      </Box>
                      <DeviceStatusChip status={device.lastConnectionStatus} />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Recent Sessions</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest calculated attendance rows for today.
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {recentSessions.map((row) => (
                    <Stack
                      key={`${row.sourceDeviceName}-${row.employeeCode}-${row.date}-${row.shift}-${row.in}`}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {row.employeeCode} - {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.department} / Shift {row.shift}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={row.status === 'missing-out' || !row.out ? 'error' : 'success'}
                        label={row.status === 'missing-out' || !row.out ? 'Missing OUT' : `${row.in}-${row.out}`}
                      />
                    </Stack>
                  ))}
                  {recentSessions.length === 0 && (
                    <Alert severity="info">No attendance sessions calculated today.</Alert>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default Dashboard;
