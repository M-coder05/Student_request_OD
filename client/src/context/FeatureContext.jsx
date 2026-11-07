import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const FeatureContext = createContext(null);

export function FeatureProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [appointmentsConfiguredEnabled, setAppointmentsConfiguredEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/config/features')
      .then((features) => {
        if (active) setAppointmentsConfiguredEnabled(features.appointments === true);
      })
      .catch((error) => {
        if (active) showToast(error.message || 'Unable to load service availability', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  return (
    <FeatureContext.Provider
      value={{
        appointmentsEnabled: appointmentsConfiguredEnabled || (user?.role === 'student' && user.isDemo === true),
        loading,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  const context = useContext(FeatureContext);
  if (!context) throw new Error('useFeatures must be used within a FeatureProvider');
  return context;
}
