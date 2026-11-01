import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function StudentHeader({ title = 'Student Dashboard', showNav = true }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar inner-header">
      <div className="container nav-wrap">
        <div className="brand">
          <span className="brand-mark">SS</span>
          <span>{title}</span>
        </div>

        {showNav ? (
          <nav className="main-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/status">Status</Link>
            <Link to="/profile">Profile</Link>
          </nav>
        ) : (
          <div className="nav-actions">
            <Link className="btn btn-secondary" to="/dashboard">
              Dashboard
            </Link>
          </div>
        )}

        <div className="nav-actions">
          <NotificationBell />
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
