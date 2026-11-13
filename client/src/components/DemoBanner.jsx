import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DemoBanner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || user.demo !== true) {
    return null;
  }

  const handleExit = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="demo-banner" role="status">
      <span>
        <strong>DEMO MODE</strong>: Changes are limited to sample data and may be reset.
      </span>
      <button type="button" onClick={handleExit}>
        Exit demo
      </button>
    </aside>
  );
}
