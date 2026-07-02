import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LanIcon from '@mui/icons-material/Lan';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  createDevice,
  deleteDevice,
  testDeviceConnection,
  updateDevice,
} from '../api/api.js';
import DeviceStatusChip from '../components/DeviceStatusChip.jsx';
import useDevices from '../hooks/useDevices.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '../notifications/notificationSettings.js';

const modelOptions = [
  'ZKTeco K14 Pro',
  'ZKTeco K14',
  'ZKTeco K40 Pro',
  'ZKTeco MB20',
  'ZKTeco MB360',
  'ZKTeco iClock Series',
  'ZKTeco SpeedFace Series',
  'Other ZKTeco Device',
];

const defaultDevice = {
  name: 'Main Entrance',
  brand: 'ZKTeco',
  model: 'ZKTeco K14 Pro',
  ipAddress: '192.168.1.201',
  port: '4370',
  protocol: 'TCP/IP',
  commKey: '0',
  location: '',
  isActive: true,
};

const twoColumnFieldsSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'minmax(0, 1fr) minmax(0, 1fr)',
  },
  gap: 2,
  alignItems: 'start',
};

const ipPortFieldsSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'minmax(0, 1.35fr) minmax(0, 0.95fr)',
  },
  gap: 2,
  alignItems: 'start',
};

function Settings() {
  const { devices, loading, error, stats, refreshDevices } = useDevices({ pollingInterval: 5000 });
  const [formData, setFormData] = useState(defaultDevice);
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleActiveChange = (event) => {
    setFormData((current) => ({
      ...current,
      isActive: event.target.checked,
    }));
  };

  const handleNotificationChange = (event) => {
    const nextSettings = {
      ...notificationSettings,
      [event.target.name]: event.target.checked,
    };
    setNotificationSettings(nextSettings);
    saveNotificationSettings(nextSettings);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      ...formData,
      port: Number(formData.port),
    };

    try {
      if (editingId) {
        await updateDevice(editingId, payload);
        setMessage({ severity: 'success', text: 'Device settings updated.' });
      } else {
        await createDevice(payload);
        setMessage({ severity: 'success', text: 'Device added.' });
      }

      setFormData(defaultDevice);
      setEditingId(null);
      await refreshDevices({ silent: true });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error.response?.data?.message || 'Cannot save device settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (device) => {
    setEditingId(device._id);
    setFormData({
      name: device.name,
      brand: device.brand,
      model: device.model,
      ipAddress: device.ipAddress,
      port: String(device.port),
      protocol: device.protocol,
      commKey: device.commKey,
      location: device.location || '',
      isActive: device.isActive,
    });
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(defaultDevice);
    setMessage(null);
  };

  const handleDelete = async (id) => {
    setMessage(null);

    try {
      await deleteDevice(id);
      setMessage({ severity: 'success', text: 'Device deleted.' });
      await refreshDevices({ silent: true });
    } catch {
      setMessage({ severity: 'error', text: 'Cannot delete device.' });
    }
  };

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
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Settings
        </Typography>
        <Typography color="text.secondary">
          Configure ZKTeco attendance devices for LAN connection.
        </Typography>
      </Box>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flex: '0 0 44px',
                        borderRadius: 1,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                      }}
                    >
                      <SettingsInputAntennaIcon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6">
                        {editingId ? 'Edit Device' : 'Add ZKTeco Device'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Default port for ZKTeco TCP/IP devices is 4370.
                      </Typography>
                    </Box>
                  </Stack>

                <TextField
                  label="Device Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <Box sx={twoColumnFieldsSx}>
                    <TextField
                      label="Brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                    <FormControl fullWidth required>
                      <InputLabel>Model</InputLabel>
                      <Select
                        label="Model"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                      >
                        {modelOptions.map((model) => (
                          <MenuItem key={model} value={model}>
                            {model}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                </Box>

                <Box sx={ipPortFieldsSx}>
                    <TextField
                      label="IP Address"
                      name="ipAddress"
                      value={formData.ipAddress}
                      onChange={handleChange}
                      placeholder="192.168.1.201"
                      fullWidth
                      required
                    />
                    <TextField
                      label="Port"
                      name="port"
                      type="number"
                      value={formData.port}
                      onChange={handleChange}
                      fullWidth
                      required
                      inputProps={{ min: 1, max: 65535 }}
                    />
                </Box>

                <Box sx={twoColumnFieldsSx}>
                    <FormControl fullWidth>
                      <InputLabel>Protocol</InputLabel>
                      <Select
                        label="Protocol"
                        name="protocol"
                        value={formData.protocol}
                        onChange={handleChange}
                      >
                        <MenuItem value="TCP/IP">TCP/IP</MenuItem>
                        <MenuItem value="UDP">UDP</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Comm Key"
                      name="commKey"
                      value={formData.commKey}
                      onChange={handleChange}
                      fullWidth
                    />
                </Box>

                <TextField
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Office, gate, floor, branch..."
                  fullWidth
                />

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                  sx={{
                    borderRadius: 1,
                    px: 0.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Active Device
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enable this device for future attendance sync.
                    </Typography>
                  </Box>
                  <Switch checked={formData.isActive} onChange={handleActiveChange} />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    type="submit"
                    startIcon={<AddIcon />}
                    disabled={saving}
                    fullWidth
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Device' : 'Save Device'}
                  </Button>
                  {editingId && (
                    <Button variant="outlined" onClick={handleCancelEdit} fullWidth>
                      Cancel
                    </Button>
                  )}
                </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6">Notification Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure live dashboard notifications from devices, sync actions, and attendance rules.
                    </Typography>
                  </Box>
                  <Divider />
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          name="deviceDisconnected"
                          checked={notificationSettings.deviceDisconnected}
                          onChange={handleNotificationChange}
                        />
                      }
                      label="Devices Disconnect"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          name="syncEmployees"
                          checked={notificationSettings.syncEmployees}
                          onChange={handleNotificationChange}
                        />
                      }
                      label="Sync Employees"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          name="syncAttendance"
                          checked={notificationSettings.syncAttendance}
                          onChange={handleNotificationChange}
                        />
                      }
                      label="Sync Attendance ZKTeco logs"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          name="employeesMissing"
                          checked={notificationSettings.employeesMissing}
                          onChange={handleNotificationChange}
                        />
                      }
                      label="Employees Missing after shift window"
                    />
                  </FormGroup>
                  <Alert severity="info">
                    Missing employee alerts appear only after the shift end time plus allowed late minutes has passed.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Configured Devices
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {stats.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Active Devices
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {stats.active}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

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
                      <Typography variant="h6">Device Connections</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ZKTeco K14 Pro and compatible TCP/IP devices.
                      </Typography>
                    </Box>
                    <Button
                      startIcon={<RefreshIcon />}
                      onClick={() => refreshDevices()}
                      disabled={loading}
                    >
                      Refresh
                    </Button>
                  </Stack>

                  <Divider />

                  {devices.length === 0 && !loading && (
                    <Alert severity="info">
                      No devices configured yet. Add your ZKTeco K14 Pro or another ZKTeco device.
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
                          <Stack spacing={2}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              spacing={1.5}
                            >
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <LanIcon color="primary" />
                                  <Typography variant="h6">{device.name}</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {device.model} - {device.ipAddress}:{device.port}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={device.isActive ? 'Active' : 'Inactive'}
                                  color={device.isActive ? 'primary' : 'default'}
                                  size="small"
                                />
                                <DeviceStatusChip status={device.lastConnectionStatus} />
                                <Chip
                                  label={device.model}
                                  size="small"
                                />
                              </Stack>
                            </Stack>

                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Protocol
                                </Typography>
                                <Typography variant="body2">{device.protocol}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Comm Key
                                </Typography>
                                <Typography variant="body2">{device.commKey || '0'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Location
                                </Typography>
                                <Typography variant="body2">{device.location || 'Not set'}</Typography>
                              </Grid>
                            </Grid>

                            {device.lastConnectionMessage && (
                              <Typography variant="body2" color="text.secondary">
                                Last test: {device.lastConnectionMessage}
                              </Typography>
                            )}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                              <Button
                                variant="outlined"
                                onClick={() => handleEdit(device)}
                                fullWidth
                              >
                                Edit
                              </Button>
                              <Button
                                variant="contained"
                                onClick={() => handleTestConnection(device._id)}
                                disabled={testingId === device._id}
                                fullWidth
                              >
                                {testingId === device._id ? 'Testing...' : 'Test Connection'}
                              </Button>
                              <Tooltip title="Delete device">
                                <IconButton
                                  aria-label={`delete ${device.name}`}
                                  color="error"
                                  onClick={() => handleDelete(device._id)}
                                >
                                  <DeleteOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default Settings;
