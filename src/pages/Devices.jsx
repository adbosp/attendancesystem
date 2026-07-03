import LanIcon from '@mui/icons-material/Lan';
import RefreshIcon from '@mui/icons-material/Refresh';
import RouterIcon from '@mui/icons-material/Router';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import DeviceStatusChip from '../components/DeviceStatusChip.jsx';
import useDevices from '../hooks/useDevices.js';
import { testDeviceConnection } from '../api/api.js';

const summaryCards = [
  { key: 'total', label: 'Total Devices', icon: <RouterIcon />, color: '#2563eb' },
  { key: 'active', label: 'Active Devices', icon: <LanIcon />, color: '#0f766e' },
  {
    key: 'connected',
    label: 'Connected',
    icon: <SettingsInputAntennaIcon />,
    color: '#16a34a',
  },
  { key: 'failed', label: 'Failed', icon: <WarningAmberIcon />, color: '#dc2626' },
];

const deviceSummaryGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 3,
  width: '100%',
};

const deviceRowGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'minmax(220px, 2fr) minmax(120px, 1fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr) minmax(120px, 0.9fr)',
  },
  gap: 2,
  alignItems: 'center',
};

function Devices() {
  const { devices, loading, error, stats, refreshDevices } = useDevices({ pollingInterval: 5000 });
  const [testingId, setTestingId] = useState(null);
  const [message, setMessage] = useState(null);

  const handleTestConnection = async (id) => {
    setTestingId(id);
    setMessage(null);

    try {
      const result = await testDeviceConnection(id);
      setMessage({
        severity: result.connected ? 'success' : 'warning',
        text: result.message,
      });
      await refreshDevices({ silent: true });
    } catch {
      setMessage({ severity: 'error', text: 'Cannot test device connection.' });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Devices
          </Typography>
          <Typography color="text.secondary">
            Monitor configured ZKTeco attendance devices in near realtime.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refreshDevices()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={deviceSummaryGridSx}>
        {summaryCards.map((card) => (
            <Card key={card.key} sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {stats[card.key]}
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
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="h6">Device Status</Typography>
                <Typography variant="body2" color="text.secondary">
                  Data refreshes automatically every 5 seconds.
                </Typography>
              </Box>
              {loading && <CircularProgress size={22} />}
            </Stack>

            <Divider />

            {!loading && devices.length === 0 && (
              <Alert severity="info">
                No devices configured yet. Add devices from the Settings page first.
              </Alert>
            )}

            <Stack spacing={2}>
              {devices.map((device) => (
                <Card
                  key={device._id}
                  variant="outlined"
                  sx={{ boxShadow: 'none', borderColor: 'divider' }}
                >
                  <CardContent>
                    <Box sx={deviceRowGridSx}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: 1,
                              display: 'grid',
                              placeItems: 'center',
                              color: 'primary.main',
                              bgcolor: 'rgba(37, 99, 235, 0.1)',
                            }}
                          >
                            <LanIcon />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" noWrap>
                              {device.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {device.model}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Network
                        </Typography>
                        <Typography variant="body2">
                          {device.ipAddress}:{device.port}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Protocol
                        </Typography>
                        <Typography variant="body2">{device.protocol}</Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <DeviceStatusChip status={device.lastConnectionStatus} />
                        </Box>
                      </Box>

                      <Box>
                        <Button
                          variant="contained"
                          onClick={() => handleTestConnection(device._id)}
                          disabled={testingId === device._id}
                          fullWidth
                        >
                          {testingId === device._id ? 'Testing...' : 'Test'}
                        </Button>
                      </Box>

                      {(device.location || device.lastConnectionMessage) && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Divider sx={{ mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {device.location ? `Location: ${device.location}` : ''}
                            {device.location && device.lastConnectionMessage ? ' - ' : ''}
                            {device.lastConnectionMessage
                              ? `Last test: ${device.lastConnectionMessage}`
                              : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Devices;
