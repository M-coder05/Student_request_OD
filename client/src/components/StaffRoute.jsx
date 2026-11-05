import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAFF_ROLES = ['faculty', 'hod', 'principal'];
const ADMIN_ROLES = ['admin', 'super_admin', 'demo_admin'];

export default function StaffRoute({ adminAllowed = false }) {
  const { isAuthenticated, user } = useAuth();
  const allowed = STAFF_ROLES.includes(user?.role) || (
    adminAllowed && ADMIN_ROLES.includes(user?.role)
  );

  if (!isAuthenticated || !allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
