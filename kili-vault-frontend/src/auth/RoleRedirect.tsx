import { Navigate } from 'react-router-dom';
import { getRoleHomePath, useAuth } from '@/auth/AuthContext';

export function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHomePath(user.role)} replace />;
}
