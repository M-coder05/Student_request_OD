import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useFeatures } from '../context/FeatureContext';
import { useToast } from '../context/ToastContext';

export default function AppointmentBookingGuard() {
  const { appointmentsEnabled, loading } = useFeatures();
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && !appointmentsEnabled) {
      showToast("Appointment booking isn't available yet.", 'error');
    }
  }, [appointmentsEnabled, loading, showToast]);

  if (loading) return null;
  if (!appointmentsEnabled) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
