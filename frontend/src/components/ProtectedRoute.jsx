import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingState from './LoadingState.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState message="Checking session..." />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}
