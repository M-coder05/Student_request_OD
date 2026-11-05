import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'student') {
    return <Navigate to={isAdmin ? '/admin' : '/appointments/requests'} replace />;
  }

  return children ? children : <Outlet />;
}
