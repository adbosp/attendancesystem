import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import Attendance from '../pages/Attendance.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Departments from '../pages/Departments.jsx';
import Devices from '../pages/Devices.jsx';
import Employees from '../pages/Employees.jsx';
import Login from '../pages/Login.jsx';
import Reports from '../pages/Reports.jsx';
import Settings from '../pages/Settings.jsx';
import Shifts from '../pages/Shifts.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="devices" element={<Devices />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="departments" element={<Departments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
