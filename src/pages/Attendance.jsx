import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BadgeIcon from '@mui/icons-material/Badge';
import DevicesIcon from '@mui/icons-material/Devices';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { fixMissingAttendance, syncAttendanceFromDevices } from '../api/api.js';
import useAttendance from '../hooks/useAttendance.js';
import useDepartments from '../hooks/useDepartments.js';
import useDevices from '../hooks/useDevices.js';
import { NOTIFICATION_EVENT } from '../notifications/notificationSettings.js';

const today = new Date().toISOString().slice(0, 10);

const attendanceFilterGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 3,
  width: '100%',
  alignItems: 'start',
};

const attendanceCardGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 3,
  width: '100%',
};

function Attendance() {
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [message, setMessage] = useState(null);
  const { devices } = useDevices({ pollingInterval: 5000 });
  const { departments } = useDepartments({ pollingInterval: 5000 });
  const { logs, summary, loading, error, stats, refreshAttendance } = useAttendance({
    startDate,
    endDate,
    deviceId: selectedDevice,
    departmentId: selectedDepartment,
    pollingInterval: 5000,
  });
  const missingOutCount = summary.filter((row) => row.status === 'missing-out' || !row.out).length;
  const visibleSummary = useMemo(() => {
    if (!showMissingOnly) {
      return summary;
    }

    return summary.filter((row) => row.status === 'missing-out' || !row.out);
  }, [showMissingOnly, summary]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncAttendanceFromDevices();
      setMessage({ severity: 'success', text: result.message });
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: {
          type: 'syncAttendance',
          severity: 'success',
          title: 'Sync attendance completed',
          message: result.message,
        },
      }));
      await refreshAttendance({ silent: true });
    } catch (apiError) {
      const errorMessage = apiError.response?.data?.message || 'Cannot sync attendance logs from devices.';
      setMessage({
        severity: 'error',
        text: errorMessage,
      });
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: {
          type: 'syncAttendance',
          severity: 'error',
          title: 'Sync attendance failed',
          message: errorMessage,
        },
      }));
    } finally {
      setSyncing(false);
    }
  };

  const handleFixMissing = async () => {
    setFixing(true);
    setMessage(null);

    try {
      const result = await fixMissingAttendance({
        startDate,
        endDate,
        deviceId: selectedDevice,
        departmentId: selectedDepartment,
      });
      setMessage({ severity: result.fixedCount > 0 ? 'success' : 'info', text: result.message });
      await refreshAttendance({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot fix missing OUT records.',
      });
    } finally {
      setFixing(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Attendance
          </Typography>
          <Typography color="text.secondary">
            Real ZKTeco logs grouped into IN/OUT sessions by MongoDB shift rules.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refreshAttendance()}
            disabled={loading || syncing || fixing}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<WarningAmberIcon />}
            onClick={handleFixMissing}
            disabled={fixing || syncing || missingOutCount === 0}
          >
            {fixing ? 'Fixing...' : 'Fix Missing'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing || fixing}
          >
            {syncing ? 'Syncing...' : 'Sync ZKTeco Logs'}
          </Button>
        </Stack>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={attendanceFilterGridSx}>
          <TextField
            label="From Date"
            type="date"
            value={startDate}
            onChange={(event) => {
              const nextStartDate = event.target.value;
              setStartDate(nextStartDate);

              if (endDate && nextStartDate > endDate) {
                setEndDate(nextStartDate);
              }
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To Date"
            type="date"
            value={endDate}
            onChange={(event) => {
              const nextEndDate = event.target.value;
              setEndDate(nextEndDate);

              if (startDate && nextEndDate < startDate) {
                setStartDate(nextEndDate);
              }
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth>
            <InputLabel>Device</InputLabel>
            <Select
              label="Device"
              value={selectedDevice}
              onChange={(event) => setSelectedDevice(event.target.value)}
            >
              <MenuItem value="all">All devices</MenuItem>
              {devices.map((device) => (
                <MenuItem key={device._id} value={device._id}>
                  {device.name} - {device.ipAddress}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Department</InputLabel>
            <Select
              label="Department"
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
            >
              <MenuItem value="all">All departments</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department._id} value={department._id}>
                  {department.departmentName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
      </Box>

      <Box sx={attendanceCardGridSx}>
        {[
          { label: 'Raw Events', value: logs.length, icon: <EventAvailableIcon />, color: '#2563eb' },
          { label: 'Attendance Rows', value: summary.length, icon: <BadgeIcon />, color: '#0f766e' },
          { label: 'Employees', value: stats.employees, icon: <AccessTimeIcon />, color: '#7c3aed' },
          {
            label: missingOutCount > 0 ? 'Missing OUT' : 'Devices',
            value: missingOutCount > 0 ? missingOutCount : stats.devices,
            icon: missingOutCount > 0 ? <WarningAmberIcon /> : <DevicesIcon />,
            color: missingOutCount > 0 ? '#dc2626' : '#d97706',
            isMissingFilter: missingOutCount > 0,
          },
        ].map((card) => (
            <Card
              key={card.label}
              onClick={() => {
                if (card.isMissingFilter) {
                  setShowMissingOnly((current) => !current);
                }
              }}
              role={card.isMissingFilter ? 'button' : undefined}
              tabIndex={card.isMissingFilter ? 0 : undefined}
              onKeyDown={(event) => {
                if (card.isMissingFilter && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setShowMissingOnly((current) => !current);
                }
              }}
              sx={{
                cursor: card.isMissingFilter ? 'pointer' : 'default',
                borderColor: card.isMissingFilter && showMissingOnly ? 'error.main' : 'divider',
                boxShadow: card.isMissingFilter && showMissingOnly ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : undefined,
                transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                '&:hover': card.isMissingFilter
                  ? {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
                    }
                  : undefined,
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
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
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6">Calculated Attendance</Typography>
                <Typography variant="body2" color="text.secondary">
                  First valid log is IN. Last valid log is OUT. Middle logs are ignored.
                </Typography>
              </Box>
              {(loading || syncing || fixing) && <CircularProgress size={22} />}
            </Stack>

            {!loading && summary.length === 0 && (
              <Alert severity="info">No attendance sessions found for this date range.</Alert>
            )}

            {missingOutCount > 0 && (
              <Alert
                severity="error"
                icon={<WarningAmberIcon />}
                action={
                  <Button color="inherit" size="small" onClick={() => setShowMissingOnly((current) => !current)}>
                    {showMissingOnly ? 'Show all' : 'Filter'}
                  </Button>
                }
              >
                {showMissingOnly
                  ? `Showing ${visibleSummary.length} missing OUT row${visibleSummary.length > 1 ? 's' : ''}.`
                  : `${missingOutCount} attendance row${missingOutCount > 1 ? 's' : ''} missing OUT punch.`}
              </Alert>
            )}

            {summary.length > 0 && visibleSummary.length === 0 && (
              <Alert severity="info">No rows match the selected filter.</Alert>
            )}

            {visibleSummary.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Day</TableCell>
                      <TableCell>In</TableCell>
                      <TableCell>Out</TableCell>
                      <TableCell>Total hours</TableCell>
                      <TableCell>Total minutes</TableCell>
                      <TableCell>Shift</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleSummary.map((row) => {
                      const isMissingOut = row.status === 'missing-out' || !row.out;

                      return (
                        <TableRow
                          key={`${row.sourceDeviceName}-${row.employeeCode}-${row.date}-${row.shift}-${row.in}`}
                          hover
                          sx={{
                            bgcolor: isMissingOut ? 'rgba(220, 38, 38, 0.08)' : 'inherit',
                            '&:hover': {
                              bgcolor: isMissingOut ? 'rgba(220, 38, 38, 0.12)' : undefined,
                            },
                          }}
                        >
                          <TableCell>
                            <Stack spacing={0.75}>
                              <Typography fontWeight={700}>{row.employeeCode}</Typography>
                              {isMissingOut && (
                                <Chip
                                  color="error"
                                  icon={<WarningAmberIcon />}
                                  label="Missing OUT"
                                  size="small"
                                  sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.deviceName || row.sourceDeviceName}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.day}</TableCell>
                          <TableCell>{row.in}</TableCell>
                          <TableCell>
                            {isMissingOut ? (
                              <Typography color="error" fontWeight={700}>
                                Missing OUT
                              </Typography>
                            ) : (
                              row.out
                            )}
                          </TableCell>
                          <TableCell>{isMissingOut ? '-' : row.totalHours}</TableCell>
                          <TableCell>{row.totalMinutes}</TableCell>
                          <TableCell>{row.shift}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Attendance;
