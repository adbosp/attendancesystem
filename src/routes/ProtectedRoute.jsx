import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredUser } from '../auth/auth.js';

function ProtectedRoute() {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
