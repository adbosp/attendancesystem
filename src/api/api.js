import axios from 'axios';

const getBaseURL = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  return `http://${window.location.hostname}:5000`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 8000,
});

export const testBackendConnection = async () => {
  const response = await api.get('/');
  return response.data;
};

export const loginAdmin = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

export const getDevices = async () => {
  const response = await api.get('/api/devices');
  return response.data;
};

export const createDevice = async (device) => {
  const response = await api.post('/api/devices', device);
  return response.data;
};

export const updateDevice = async (id, device) => {
  const response = await api.patch(`/api/devices/${id}`, device);
  return response.data;
};

export const deleteDevice = async (id) => {
  const response = await api.delete(`/api/devices/${id}`);
  return response.data;
};

export const testDeviceConnection = async (id) => {
  const response = await api.post(`/api/devices/${id}/test-connection`);
  return response.data;
};

export const getEmployees = async () => {
  const response = await api.get('/api/employees');
  return response.data;
};

export const syncEmployeesFromDevices = async () => {
  const response = await api.post('/api/employees/sync');
  return response.data;
};

export const createEmployee = async (employee) => {
  const response = await api.post('/api/employees', employee);
  return response.data;
};

export const updateEmployee = async (id, employee) => {
  const response = await api.patch(`/api/employees/${id}`, employee);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/api/employees/${id}`);
  return response.data;
};

export const syncEmployeeToDevice = async (id) => {
  const response = await api.post(`/api/employees/${id}/sync-to-device`);
  return response.data;
};

export const getDepartments = async () => {
  const response = await api.get('/api/departments');
  return response.data;
};

export const createDepartment = async (department) => {
  const response = await api.post('/api/departments', department);
  return response.data;
};

export const updateDepartment = async (id, department) => {
  const response = await api.patch(`/api/departments/${id}`, department);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/api/departments/${id}`);
  return response.data;
};

export const getAttendanceLogs = async ({ date, startDate, endDate, deviceId = 'all', departmentId = 'all' } = {}) => {
  const response = await api.get('/api/attendance', {
    params: {
      date,
      startDate,
      endDate,
      deviceId,
      departmentId,
    },
  });
  return response.data;
};

export const getAttendanceSummary = async ({ date, startDate, endDate, deviceId = 'all', departmentId = 'all' } = {}) => {
  const response = await api.get('/api/attendance/summary', {
    params: {
      date,
      startDate,
      endDate,
      deviceId,
      departmentId,
    },
  });
  return response.data;
};

export const syncAttendanceFromDevices = async () => {
  const response = await api.post('/api/attendance/sync');
  return response.data;
};

export const fixMissingAttendance = async ({
  date,
  startDate,
  endDate,
  deviceId = 'all',
  departmentId = 'all',
} = {}) => {
  const response = await api.post('/api/attendance/fix-missing', {
    date,
    startDate,
    endDate,
    deviceId,
    departmentId,
  });
  return response.data;
};

export const getShifts = async () => {
  const response = await api.get('/api/shifts');
  return response.data;
};

export const createShift = async (shift) => {
  const response = await api.post('/api/shifts', shift);
  return response.data;
};

export const updateShift = async (id, shift) => {
  const response = await api.patch(`/api/shifts/${id}`, shift);
  return response.data;
};

export const deleteShift = async (id) => {
  const response = await api.delete(`/api/shifts/${id}`);
  return response.data;
};

export default api;
