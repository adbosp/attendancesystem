import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
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
import { createShift, deleteShift, updateShift } from '../api/api.js';
import useShifts from '../hooks/useShifts.js';

const emptyForm = {
  shiftCode: '',
  shiftName: '',
  startTime: '06:00',
  endTime: '14:00',
  allowedEarlyMinutes: 30,
  allowedLateMinutes: 30,
  isOvernight: false,
  isActive: true,
};

function Shifts() {
  const { shifts, loading, error, refreshShifts } = useShifts({ pollingInterval: 5000 });
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeCount = useMemo(
    () => shifts.filter((shift) => shift.isActive).length,
    [shifts],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: Number(value),
    }));
  };

  const handleBooleanChange = (event) => {
    const { name, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: checked,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        await updateShift(editingId, formData);
        setMessage({ severity: 'success', text: 'Shift updated.' });
      } else {
        await createShift(formData);
        setMessage({ severity: 'success', text: 'Shift added.' });
      }

      resetForm();
      await refreshShifts({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot save shift.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (shift) => {
    setEditingId(shift._id);
    setFormData({
      shiftCode: shift.shiftCode,
      shiftName: shift.shiftName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      allowedEarlyMinutes: shift.allowedEarlyMinutes,
      allowedLateMinutes: shift.allowedLateMinutes,
      isOvernight: shift.isOvernight,
      isActive: shift.isActive,
    });
    setMessage(null);
  };

  const handleDelete = async (id) => {
    setMessage(null);

    try {
      await deleteShift(id);
      setMessage({ severity: 'success', text: 'Shift deleted.' });
      await refreshShifts({ silent: true });
    } catch (apiError) {
      setMessage({
        severity: 'error',
        text: apiError.response?.data?.message || 'Cannot delete shift.',
      });
    }
  };

  const handleToggleActive = async (shift) => {
    try {
      await updateShift(shift._id, { isActive: !shift.isActive });
      await refreshShifts({ silent: true });
    } catch {
      setMessage({ severity: 'error', text: 'Cannot update shift status.' });
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
            Shifts
          </Typography>
          <Typography color="text.secondary">
            Configure MongoDB shifts used by real ZKTeco attendance calculations.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refreshShifts()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Shifts
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {shifts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Active Shifts
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {activeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Inactive Shifts
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {shifts.length - activeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <WorkHistoryIcon color="primary" />
                  <Box>
                    <Typography variant="h6">
                      {editingId ? 'Edit Shift' : 'Add Shift'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Changes are saved to MongoDB.
                    </Typography>
                  </Box>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Shift Code"
                      name="shiftCode"
                      value={formData.shiftCode}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <TextField
                      label="Shift Name"
                      name="shiftName"
                      value={formData.shiftName}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Start Time"
                      name="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={handleChange}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="End Time"
                      name="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={handleChange}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Allowed Early"
                      name="allowedEarlyMinutes"
                      type="number"
                      value={formData.allowedEarlyMinutes}
                      onChange={handleNumberChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Allowed Late"
                      name="allowedLateMinutes"
                      type="number"
                      value={formData.allowedLateMinutes}
                      onChange={handleNumberChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700}>
                      Overnight Shift
                    </Typography>
                    <Switch
                      name="isOvernight"
                      checked={formData.isOvernight}
                      onChange={handleBooleanChange}
                    />
                  </Stack>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700}>
                      Active
                    </Typography>
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleBooleanChange}
                    />
                  </Stack>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={editingId ? <SaveIcon /> : <AddIcon />}
                    disabled={saving}
                    fullWidth
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Shift' : 'Save Shift'}
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
                    <Typography variant="h6">Custom Shift Rules</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance uses these active shifts to calculate IN/OUT sessions.
                    </Typography>
                  </Box>
                  {loading && <CircularProgress size={22} />}
                </Stack>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Allowed Range</TableCell>
                        <TableCell>Overnight</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift._id} hover>
                          <TableCell>
                            <Typography fontWeight={700}>{shift.shiftCode}</Typography>
                          </TableCell>
                          <TableCell>{shift.shiftName}</TableCell>
                          <TableCell>
                            {shift.startTime} - {shift.endTime}
                          </TableCell>
                          <TableCell>
                            Early {shift.allowedEarlyMinutes}m / Late {shift.allowedLateMinutes}m
                          </TableCell>
                          <TableCell>{shift.isOvernight ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <Chip
                              label={shift.isActive ? 'Active' : 'Inactive'}
                              color={shift.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title={shift.isActive ? 'Disable' : 'Enable'}>
                              <Switch
                                checked={shift.isActive}
                                onChange={() => handleToggleActive(shift)}
                              />
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton onClick={() => handleEdit(shift)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton color="error" onClick={() => handleDelete(shift._id)}>
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default Shifts;
