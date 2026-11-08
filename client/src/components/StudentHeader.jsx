import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useFeatures } from '../context/FeatureContext';

export default function StudentHeader({ title = 'Student Dashboard', showNav = true }) {
  const { logout, user } = useAuth();
  const { appointmentsEnabled } = useFeatures();
  const navigate = useNavigate();
  const isStaff = ['faculty', 'hod', 'principal'].includes(user?.role);
  const isAdmin = ['admin', 'super_admin', 'demo_admin'].includes(user?.role);

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
            {isStaff ? (
              <>
                <Link to="/appointments/availability">My availability</Link>
                <Link to="/appointments/requests">Appointment requests</Link>
                <Link to="/appointments/today">Today’s schedule</Link>
              </>
            ) : isAdmin ? (
              <>
                <Link to="/appointments/requests">Appointment requests</Link>
                <Link to="/appointments/today">Today’s schedule</Link>
              </>
            ) : (
              <>
                {appointmentsEnabled ? (
                  <>
                    <Link to="/appointments/book">Book appointment</Link>
                    <Link to="/appointments">My appointments</Link>
                  </>
                ) : null}
                <Link to="/status">Status</Link>
                <Link to="/profile">Profile</Link>
              </>
            )}
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
