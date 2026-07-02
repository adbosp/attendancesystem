import ApartmentIcon from '@mui/icons-material/Apartment';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
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
  createDepartment,
  deleteDepartment,
  updateDepartment,
  updateEmployee,
} from '../api/api.js';
import useDepartments from '../hooks/useDepartments.js';
import useEmployees from '../hooks/useEmployees.js';

const defaultForm = {
  departmentCode: '',
  departmentName: '',
  description: '',
  isActive: true,
};

function Departments() {
  const { departments, loading, error, stats, refreshDepartments } = useDepartments({ pollingInterval: 5000 });
  const {
    employees,
    loading: employeesLoading,
    error: employeesError,
    refreshEmployees,
  } = useEmployees({ pollingInterval: 5000 });
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const activeDepartments = useMemo(
    () => departments.filter((department) => department.isActive),
    [departments],
  );
  const selectedEmployeeSet = useMemo(() => new Set(selectedEmployees), [selectedEmployees]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSwitch = (event) => {
    setFormData((current) => ({
      ...current,
      isActive: event.target.checked,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
  };

  const handleEdit = (department) => {
    setEditingId(department._id);
    setFormData({
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      description: department.description || '',
      isActive: department.isActive,
    });
    setMessage(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        await updateDepartment(editingId, formData);
        setMessage({ severity: 'success', text: 'Department updated.' });
      } else {
        await createDepartment(formData);
        setMessage({ severity: 'success', text: 'Department created.' });
      }

      resetForm();
      await refreshDepartments({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot save department.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    setMessage(null);

    try {
      const result = await deleteDepartment(department._id);
      setMessage({ severity: 'warning', text: result.message });
      await refreshDepartments({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot delete department.',
      });
    }
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees((current) => (
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    ));
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployees(employees.map((employee) => employee._id));
  };

  const handleClearSelectedEmployees = () => {
    setSelectedEmployees([]);
  };

  const handleBulkUpdate = async () => {
    if (!bulkDepartment || selectedEmployees.length === 0) {
      setMessage({
        severity: 'warning',
        text: 'Select a department and at least one employee before updating.',
      });
      return;
    }

    setBulkUpdating(true);
    setMessage(null);

    try {
      await Promise.all(
        selectedEmployees.map((employeeId) => updateEmployee(employeeId, { department: bulkDepartment })),
      );
      setMessage({
        severity: 'success',
        text: `Updated ${selectedEmployees.length} employee record${selectedEmployees.length > 1 ? 's' : ''}.`,
      });
      setSelectedEmployees([]);
      await refreshEmployees({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot update selected employees.',
      });
    } finally {
      setBulkUpdating(false);
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
            Departments
          </Typography>
          <Typography color="text.secondary">
            Department structure and team grouping for employee classification.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refreshDepartments()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {employeesError && <Alert severity="error">{employeesError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Departments
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {stats.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Inactive
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {stats.total - stats.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h6">Bulk Assign Employees</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tick employees and update them into one department group at once.
                </Typography>
              </Box>
              {(employeesLoading || bulkUpdating) && <CircularProgress size={22} />}
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    label="Department"
                    value={bulkDepartment}
                    onChange={(event) => setBulkDepartment(event.target.value)}
                  >
                    {activeDepartments.map((department) => (
                      <MenuItem key={department._id} value={department._id}>
                        {department.departmentName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={7}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    onClick={handleSelectAllEmployees}
                    disabled={employees.length === 0 || bulkUpdating}
                    fullWidth
                  >
                    Select all
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearSelectedEmployees}
                    disabled={selectedEmployees.length === 0 || bulkUpdating}
                    fullWidth
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleBulkUpdate}
                    disabled={!bulkDepartment || selectedEmployees.length === 0 || bulkUpdating}
                    fullWidth
                  >
                    {bulkUpdating ? 'Updating...' : `Update Selected (${selectedEmployees.length})`}
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {activeDepartments.length === 0 && (
              <Alert severity="info">Create an active department before assigning employees.</Alert>
            )}

            <TableContainer sx={{ maxHeight: 420 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Code</TableCell>
                    <TableCell>Display Name</TableCell>
                    <TableCell>Device</TableCell>
                    <TableCell>Current Department</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow
                      key={employee._id}
                      hover
                      selected={selectedEmployeeSet.has(employee._id)}
                      onClick={() => handleSelectEmployee(employee._id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedEmployeeSet.has(employee._id)}
                          onChange={() => handleSelectEmployee(employee._id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>{employee.employeeCode}</Typography>
                      </TableCell>
                      <TableCell>{employee.displayName || employee.name}</TableCell>
                      <TableCell>{employee.sourceDeviceName}</TableCell>
                      <TableCell>{employee.departmentName || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {!employeesLoading && employees.length === 0 && (
              <Alert severity="info">No employees found. Sync employees from devices first.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2.5} component="form" onSubmit={handleSave}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <ApartmentIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{editingId ? 'Edit Department' : 'Add Department'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Departments are stored only in the system database.
                    </Typography>
                  </Box>
                </Stack>

                <TextField
                  label="Department Code"
                  name="departmentCode"
                  value={formData.departmentCode}
                  onChange={handleChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Department Name"
                  name="departmentName"
                  value={formData.departmentName}
                  onChange={handleChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <FormControlLabel
                  control={<Switch checked={formData.isActive} onChange={handleSwitch} />}
                  label="Active"
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving} fullWidth>
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
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6">Department List</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assign employees to these departments from the Employees page.
                    </Typography>
                  </Box>
                  {loading && <CircularProgress size={22} />}
                </Stack>

                {!loading && departments.length === 0 && (
                  <Alert severity="info">No departments yet. Add the first department to classify employees.</Alert>
                )}

                {departments.length > 0 && (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {departments.map((department) => (
                          <TableRow key={department._id} hover>
                            <TableCell>
                              <Typography fontWeight={700}>{department.departmentCode}</Typography>
                            </TableCell>
                            <TableCell>{department.departmentName}</TableCell>
                            <TableCell>{department.description || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                color={department.isActive ? 'success' : 'default'}
                                label={department.isActive ? 'Active' : 'Inactive'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton onClick={() => handleEdit(department)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton color="error" onClick={() => handleDelete(department)}>
                                  <DeleteOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default Departments;
