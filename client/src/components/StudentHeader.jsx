import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useFeatures } from '../context/FeatureContext';

export default function StudentHeader({ title = 'Student Dashboard', showNav = true }) {
  const { logout, user } = useAuth();
  const { appointmentsEnabled } = useFeatures();
  const navigate = useNavigate();
  const location = useLocation();
  const isStaff = ['faculty', 'hod', 'principal'].includes(user?.role);
  const isAdmin = ['admin', 'super_admin', 'demo_admin'].includes(user?.role);
  const isCurrent = (path) => location.pathname === path;

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
          <nav className="main-nav" aria-label="Portal navigation">
            <Link to="/dashboard" aria-current={isCurrent('/dashboard') ? 'page' : undefined}>
              Dashboard
            </Link>
            {isStaff ? (
              <>
                <Link
                  to="/appointments/availability"
                  aria-current={isCurrent('/appointments/availability') ? 'page' : undefined}
                >
                  My availability
                </Link>
                <Link
                  to="/appointments/requests"
                  aria-current={isCurrent('/appointments/requests') ? 'page' : undefined}
                >
                  Appointment requests
                </Link>
                <Link
                  to="/appointments/today"
                  aria-current={isCurrent('/appointments/today') ? 'page' : undefined}
                >
                  Today’s schedule
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <Link
                  to="/appointments/requests"
                  aria-current={isCurrent('/appointments/requests') ? 'page' : undefined}
                >
                  Appointment requests
                </Link>
                <Link
                  to="/appointments/today"
                  aria-current={isCurrent('/appointments/today') ? 'page' : undefined}
                >
                  Today’s schedule
                </Link>
              </>
            ) : (
              <>
                {appointmentsEnabled ? (
                  <>
                    <Link
                      to="/appointments/book"
                      aria-current={isCurrent('/appointments/book') ? 'page' : undefined}
                    >
                      Book appointment
                    </Link>
                    <Link
                      to="/appointments"
                      aria-current={isCurrent('/appointments') ? 'page' : undefined}
                    >
                      My appointments
                    </Link>
                  </>
                ) : null}
                <Link to="/status" aria-current={isCurrent('/status') ? 'page' : undefined}>
                  Status
                </Link>
                <Link to="/profile" aria-current={isCurrent('/profile') ? 'page' : undefined}>
                  Profile
                </Link>
              </>
            )}
          </nav>
        ) : (
          <div className="nav-actions">
            <Link
              className="btn btn-secondary"
              to="/dashboard"
              aria-current={isCurrent('/dashboard') ? 'page' : undefined}
            >
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
