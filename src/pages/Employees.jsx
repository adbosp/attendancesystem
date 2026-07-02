import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import GroupsIcon from '@mui/icons-material/Groups';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import {
  createEmployee,
  deleteEmployee,
  syncEmployeeToDevice,
  syncEmployeesFromDevices,
  updateEmployee,
  deleteEmployeeFingerprint,
  markEmployeeFingerprintSynced,
  saveEmployeeFingerprint,
} from '../api/api.js';
import useDevices from '../hooks/useDevices.js';
import useDepartments from '../hooks/useDepartments.js';
import useEmployees from '../hooks/useEmployees.js';
import { NOTIFICATION_EVENT } from '../notifications/notificationSettings.js';

const defaultForm = {
  employeeCode: '',
  name: '',
  displayName: '',
  department: '',
  cardNumber: '',
  uid: '',
  role: 0,
  password: '',
  sourceDevice: '',
  isActive: true,
};

const fingerOptions = [
  { value: 0, label: 'Ngón út trái' },
  { value: 1, label: 'Ngón áp út trái' },
  { value: 2, label: 'Ngón giữa trái' },
  { value: 3, label: 'Ngón trỏ trái' },
  { value: 4, label: 'Ngón cái trái' },
  { value: 5, label: 'Ngón cái phải' },
  { value: 6, label: 'Ngón trỏ phải' },
  { value: 7, label: 'Ngón giữa phải' },
  { value: 8, label: 'Ngón áp út phải' },
  { value: 9, label: 'Ngón út phải' },
];

const defaultFingerprintForm = {
  fingerIndex: 6,
  status: 'pending',
  templateSize: '',
  note: '',
};

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function Employees() {
  const { employees, loading, error, refreshEmployees } = useEmployees({ pollingInterval: 5000 });
  const { devices } = useDevices({ pollingInterval: 5000 });
  const { departments } = useDepartments({ pollingInterval: 5000 });
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushingId, setPushingId] = useState(null);
  const [fingerprintEmployee, setFingerprintEmployee] = useState(null);
  const [fingerprintForm, setFingerprintForm] = useState(defaultFingerprintForm);
  const [savingFingerprint, setSavingFingerprint] = useState(false);
  const [message, setMessage] = useState(null);

  const activeDevices = useMemo(() => devices.filter((device) => device.isActive), [devices]);

  const employeesByDevice = useMemo(() => {
    const groups = new Map();

    for (const device of devices) {
      groups.set(device._id, {
        device,
        employees: [],
      });
    }

    for (const employee of employees) {
      const deviceId = employee.sourceDevice?._id || employee.sourceDevice;
      if (!groups.has(deviceId)) {
        groups.set(deviceId, {
          device: {
            _id: deviceId,
            name: employee.sourceDeviceName,
            ipAddress: employee.sourceDeviceIp,
            model: 'Unknown',
          },
          employees: [],
        });
      }

      groups.get(deviceId).employees.push(employee);
    }

    return Array.from(groups.values()).filter((group) => group.employees.length > 0);
  }, [devices, employees]);

  const visibleGroups = useMemo(() => {
    if (selectedDevice === 'all') {
      return employeesByDevice;
    }

    return employeesByDevice.filter((group) => group.device._id === selectedDevice);
  }, [employeesByDevice, selectedDevice]);

  const cardCount = useMemo(
    () => employees.filter((employee) => employee.cardNumber).length,
    [employees],
  );

  const fingerprintCount = useMemo(
    () => employees.reduce((total, employee) => total + (employee.fingerprints?.length || 0), 0),
    [employees],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      ...defaultForm,
      sourceDevice: selectedDevice === 'all' ? '' : selectedDevice,
    });
  };

  const handleEdit = (employee) => {
    setEditingId(employee._id);
    setFormData({
      employeeCode: employee.employeeCode,
      name: employee.name,
      displayName: employee.displayName || employee.name,
      department: employee.department?._id || employee.department || '',
      cardNumber: employee.cardNumber || '',
      uid: employee.uid ?? '',
      role: employee.role || 0,
      password: employee.password || '',
      sourceDevice: employee.sourceDevice?._id || employee.sourceDevice,
      isActive: employee.isActive,
    });
    setMessage(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        displayName: formData.displayName || formData.name,
        department: formData.department || null,
        uid: formData.uid === '' ? formData.employeeCode : formData.uid,
      };

      if (editingId) {
        await updateEmployee(editingId, payload);
        setMessage({ severity: 'success', text: 'Employee updated in system database.' });
      } else {
        await createEmployee(payload);
        setMessage({ severity: 'success', text: 'Employee added to system database.' });
      }

      resetForm();
      await refreshEmployees({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot save employee.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    setMessage(null);

    try {
      const result = await deleteEmployee(employee._id);
      setMessage({ severity: 'warning', text: result.message });
      await refreshEmployees({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot delete employee.',
      });
    }
  };

  const handlePullFromDevices = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncEmployeesFromDevices();
      setMessage({ severity: 'success', text: result.message });
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: {
          type: 'syncEmployees',
          severity: 'success',
          title: 'Sync employees completed',
          message: result.message,
        },
      }));
      await refreshEmployees({ silent: true });
    } catch (apiError) {
      const errorMessage = apiError.response?.data?.message || 'Cannot sync users from devices.';
      setMessage({
        severity: 'error',
        text: errorMessage,
      });
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: {
          type: 'syncEmployees',
          severity: 'error',
          title: 'Sync employees failed',
          message: errorMessage,
        },
      }));
    } finally {
      setSyncing(false);
    }
  };

  const handlePushToDevice = async (employee) => {
    setPushingId(employee._id);
    setMessage(null);

    try {
      const result = await syncEmployeeToDevice(employee._id);
      setMessage({ severity: 'success', text: result.message });
      await refreshEmployees({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot sync employee to device.',
      });
    } finally {
      setPushingId(null);
    }
  };

  const openFingerprintDialog = (employee) => {
    setFingerprintEmployee(employee);
    setFingerprintForm(defaultFingerprintForm);
    setMessage(null);
  };

  const closeFingerprintDialog = () => {
    setFingerprintEmployee(null);
    setFingerprintForm(defaultFingerprintForm);
    setSavingFingerprint(false);
  };

  const handleFingerprintFormChange = (event) => {
    const { name, value } = event.target;
    setFingerprintForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSaveFingerprint = async (event) => {
    event.preventDefault();

    if (!fingerprintEmployee) {
      return;
    }

    const finger = fingerOptions.find((option) => option.value === Number(fingerprintForm.fingerIndex));
    setSavingFingerprint(true);
    setMessage(null);

    try {
      const result = await saveEmployeeFingerprint(fingerprintEmployee._id, {
        ...fingerprintForm,
        fingerIndex: Number(fingerprintForm.fingerIndex),
        fingerName: finger?.label || `Finger ${fingerprintForm.fingerIndex}`,
        templateSize: fingerprintForm.templateSize === '' ? 0 : Number(fingerprintForm.templateSize),
      });

      const updatedEmployees = await refreshEmployees({ silent: true });
      setMessage({ severity: 'success', text: result.message });
      const updatedEmployee = updatedEmployees?.find?.((employee) => employee._id === fingerprintEmployee._id);
      if (updatedEmployee) {
        setFingerprintEmployee(updatedEmployee);
      }
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot save fingerprint.',
      });
    } finally {
      setSavingFingerprint(false);
    }
  };

  const handleMarkFingerprintSynced = async (fingerIndex) => {
    if (!fingerprintEmployee) {
      return;
    }

    setSavingFingerprint(true);
    setMessage(null);

    try {
      const result = await markEmployeeFingerprintSynced(fingerprintEmployee._id, fingerIndex);
      setMessage({ severity: 'success', text: result.message });
      await refreshEmployees({ silent: true });
      setFingerprintEmployee(result.employee);
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot update fingerprint sync status.',
      });
    } finally {
      setSavingFingerprint(false);
    }
  };

  const handleDeleteFingerprint = async (fingerIndex) => {
    if (!fingerprintEmployee) {
      return;
    }

    setSavingFingerprint(true);
    setMessage(null);

    try {
      const result = await deleteEmployeeFingerprint(fingerprintEmployee._id, fingerIndex);
      setMessage({ severity: 'warning', text: result.message });
      await refreshEmployees({ silent: true });
      setFingerprintEmployee(result.employee);
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot delete fingerprint.',
      });
    } finally {
      setSavingFingerprint(false);
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
            Employees
          </Typography>
          <Typography color="text.secondary">
            Manage employees by source device and sync user data with ZKTeco devices.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refreshEmployees()}
            disabled={loading || syncing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handlePullFromDevices}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Pull from Devices'}
          </Button>
        </Stack>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Employees
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {employees.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Card Numbers
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {cardCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Fingerprints
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {fingerprintCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2.5} component="form" onSubmit={handleSave}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <GroupsIcon color="primary" />
                  <Box>
                    <Typography variant="h6">
                      {editingId ? 'Edit Employee' : 'Add Employee'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Save in system first, then push to the selected device.
                    </Typography>
                  </Box>
                </Stack>

                <FormControl fullWidth required>
                  <InputLabel>Source Device</InputLabel>
                  <Select
                    label="Source Device"
                    name="sourceDevice"
                    value={formData.sourceDevice}
                    onChange={handleChange}
                    disabled={Boolean(editingId)}
                  >
                    {activeDevices.map((device) => (
                      <MenuItem key={device._id} value={device._id}>
                        {device.name} - {device.ipAddress}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Employee Code"
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="UID"
                      name="uid"
                      type="number"
                      value={formData.uid}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Device Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <TextField
                  label="Display Name"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  fullWidth
                  helperText="Stored only in system database. This name is not synced to ZKTeco devices."
                />

                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {departments
                      .filter((department) => department.isActive || department._id === formData.department)
                      .map((department) => (
                        <MenuItem key={department._id} value={department._id}>
                          {department.departmentName}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Card Number"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Role"
                  name="role"
                  type="number"
                  value={formData.role}
                  onChange={handleChange}
                  fullWidth
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                    fullWidth
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                  </Button>
                  {editingId && (
                    <Button variant="outlined" onClick={resetForm} fullWidth>
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h6">Employees by Device</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pull reads users from devices. Push writes one system employee to its source device.
                    </Typography>
                  </Box>
                  {(loading || syncing) && <CircularProgress size={22} />}
                </Stack>

                <FormControl fullWidth>
                  <InputLabel>Filter Device</InputLabel>
                  <Select
                    label="Filter Device"
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

                <Divider />

                {!loading && employees.length === 0 && (
                  <Alert severity="info">
                    No employees synced yet. Pull from devices or add an employee manually.
                  </Alert>
                )}

                <Stack spacing={3}>
                  {visibleGroups.map((group) => (
                    <Box key={group.device._id}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 1.5 }}
                      >
                        <Box>
                          <Typography variant="h6">{group.device.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {group.device.model} - {group.device.ipAddress}
                          </Typography>
                        </Box>
                        <Chip label={`${group.employees.length} employees`} color="primary" />
                      </Stack>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Code</TableCell>
                              <TableCell>Display Name</TableCell>
                              <TableCell>Device Name</TableCell>
                              <TableCell>Department</TableCell>
                              <TableCell>Card</TableCell>
                              <TableCell>Fingerprint</TableCell>
                              <TableCell>UID</TableCell>
                              <TableCell>Last Synced</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.employees.map((employee) => (
                              <TableRow key={employee._id} hover>
                                <TableCell>
                                  <Typography fontWeight={700}>{employee.employeeCode}</Typography>
                                </TableCell>
                                <TableCell>{employee.displayName || employee.name}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.departmentName || 'Unassigned'}</TableCell>
                                <TableCell>{employee.cardNumber || 'Not set'}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    icon={<FingerprintIcon />}
                                    label={`${employee.fingerprints?.length || 0}/10`}
                                    color={employee.fingerprints?.length ? 'success' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>{employee.uid ?? '-'}</TableCell>
                                <TableCell>{formatDate(employee.lastSyncedAt)}</TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton onClick={() => handleEdit(employee)}>
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Push to device">
                                    <IconButton
                                      color="primary"
                                      onClick={() => handlePushToDevice(employee)}
                                      disabled={pushingId === employee._id}
                                    >
                                      <UploadIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Manage fingerprints">
                                    <IconButton
                                      color="secondary"
                                      onClick={() => openFingerprintDialog(employee)}
                                    >
                                      <FingerprintIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete from system">
                                    <IconButton
                                      color="error"
                                      onClick={() => handleDelete(employee)}
                                    >
                                      <DeleteOutlineIcon />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(fingerprintEmployee)}
        onClose={closeFingerprintDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FingerprintIcon color="primary" />
            <Box>
              <Typography variant="h6">Gắn vân tay nhân viên</Typography>
              <Typography variant="body2" color="text.secondary">
                {fingerprintEmployee?.employeeCode} - {fingerprintEmployee?.displayName || fingerprintEmployee?.name}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Stack spacing={2} component="form" id="fingerprint-form" onSubmit={handleSaveFingerprint}>
                <FormControl fullWidth>
                  <InputLabel>Ngón tay</InputLabel>
                  <Select
                    label="Ngón tay"
                    name="fingerIndex"
                    value={fingerprintForm.fingerIndex}
                    onChange={handleFingerprintFormChange}
                  >
                    {fingerOptions.map((finger) => (
                      <MenuItem key={finger.value} value={finger.value}>
                        {finger.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    label="Trạng thái"
                    name="status"
                    value={fingerprintForm.status}
                    onChange={handleFingerprintFormChange}
                  >
                    <MenuItem value="pending">Chờ đăng ký trên máy</MenuItem>
                    <MenuItem value="enrolled">Đã có vân tay</MenuItem>
                    <MenuItem value="needs_sync">Cần đồng bộ</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Dung lượng template"
                  name="templateSize"
                  type="number"
                  value={fingerprintForm.templateSize}
                  onChange={handleFingerprintFormChange}
                  fullWidth
                  helperText="Có thể để trống nếu chưa đọc template từ thiết bị."
                />

                <TextField
                  label="Ghi chú"
                  name="note"
                  value={fingerprintForm.note}
                  onChange={handleFingerprintFormChange}
                  fullWidth
                  multiline
                  minRows={3}
                />

                <Alert severity="info">
                  Hiện tại hệ thống lưu thông tin gắn vân tay trong MongoDB. Lệnh enroll template trực tiếp xuống ZKTeco sẽ nối ở bước tích hợp SDK thiết bị.
                </Alert>
              </Stack>
            </Grid>

            <Grid item xs={12} md={7}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Danh sách vân tay đã gắn
                </Typography>
                {fingerprintEmployee?.fingerprints?.length ? (
                  fingerprintEmployee.fingerprints
                    .slice()
                    .sort((a, b) => a.fingerIndex - b.fingerIndex)
                    .map((fingerprint) => (
                      <Card key={fingerprint.fingerIndex} variant="outlined">
                        <CardContent>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={1.5}
                          >
                            <Box>
                              <Typography fontWeight={700}>
                                {fingerprint.fingerName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Slot {fingerprint.fingerIndex} - Template {fingerprint.templateSize || 0} bytes
                              </Typography>
                              {fingerprint.note && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {fingerprint.note}
                                </Typography>
                              )}
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                label={
                                  fingerprint.status === 'enrolled'
                                    ? 'Đã đăng ký'
                                    : fingerprint.status === 'needs_sync'
                                      ? 'Cần đồng bộ'
                                      : 'Chờ đăng ký'
                                }
                                color={
                                  fingerprint.status === 'enrolled'
                                    ? 'success'
                                    : fingerprint.status === 'needs_sync'
                                      ? 'warning'
                                      : 'default'
                                }
                              />
                              <Tooltip title="Đánh dấu đã đồng bộ">
                                <span>
                                  <IconButton
                                    color="primary"
                                    disabled={savingFingerprint}
                                    onClick={() => handleMarkFingerprintSynced(fingerprint.fingerIndex)}
                                  >
                                    <SyncIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Xóa vân tay">
                                <span>
                                  <IconButton
                                    color="error"
                                    disabled={savingFingerprint}
                                    onClick={() => handleDeleteFingerprint(fingerprint.fingerIndex)}
                                  >
                                    <DeleteOutlineIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <Alert severity="warning">Nhân viên này chưa gắn vân tay.</Alert>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFingerprintDialog}>Đóng</Button>
          <Button
            type="submit"
            form="fingerprint-form"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={savingFingerprint}
          >
            {savingFingerprint ? 'Đang lưu...' : 'Lưu vân tay'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default Employees;
