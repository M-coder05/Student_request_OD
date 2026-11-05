import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StudentHeader from '../components/StudentHeader';
import DemoBanner from '../components/DemoBanner';

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isStaff = ['faculty', 'hod', 'principal'].includes(user?.role);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    approvedRequests: 0,
    resolvedRequests: 0,
    rejectedRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isStaff) {
      setLoading(false);
      return undefined;
    }
    let isMounted = true;
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const result = await apiRequest('/student/dashboard');
        if (!isMounted) return;
        setStats({
          totalRequests: result.totalRequests ?? 0,
          pendingRequests: result.pendingRequests ?? 0,
          inProgressRequests: result.inProgressRequests ?? 0,
          approvedRequests: result.approvedRequests ?? 0,
          resolvedRequests: result.resolvedRequests ?? 0,
          rejectedRequests: result.rejectedRequests ?? 0,
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load dashboard data');
        showToast(err.message || 'Failed to load dashboard data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [showToast, isStaff]);

  if (isStaff) {
    return (
      <>
        <DemoBanner />
        <StudentHeader title="Staff dashboard" showNav />
        <main className="page-shell">
          <div className="container">
            <section className="welcome card">
              <div><span className="eyebrow">{user?.role}</span><h2>Welcome, {user?.name || 'Staff member'}</h2></div>
              <div className="profile-summary"><span>Department: {user?.department || '—'}</span></div>
            </section>
            <section className="service-grid dashboard-grid">
              <Link className="service-card dash-card" to="/appointments/requests">
                <div className="icon-wrap"><i className="fas fa-inbox"></i></div>
                <h3>Appointment requests</h3>
                <p>Review, approve, reject or reschedule student requests.</p>
              </Link>
              <Link className="service-card dash-card" to="/appointments/today">
                <div className="icon-wrap"><i className="fas fa-calendar-day"></i></div>
                <h3>Today's schedule</h3>
                <p>View today's appointments and record outcomes.</p>
              </Link>
              <Link className="service-card dash-card" to="/appointments/availability">
                <div className="icon-wrap"><i className="fas fa-clock"></i></div>
                <h3>My availability</h3>
                <p>Set weekly meeting slots and blackout dates.</p>
              </Link>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Student Dashboard" showNav={true} />

      <main className="page-shell">
        <div className="container">
          <section className="welcome card">
            <div>
              <span className="eyebrow">Welcome back</span>
              <h2>{user?.name || 'Student'}</h2>
            </div>
            <div className="profile-summary">
              <span>Reg No: {user?.registerNumber || '--'}</span>
              <span>Dept: {user?.department || '--'}</span>
              <span>Year: {user?.year || '--'}</span>
            </div>
          </section>

          {error && (
            <div className="card" style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', marginBottom: '20px' }}>
              <p style={{ margin: 0 }}><strong>Error:</strong> {error}</p>
            </div>
          )}

          <section className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Requests</span>
              <strong>{loading ? '…' : stats.totalRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending</span>
              <strong>{loading ? '…' : stats.pendingRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">In Progress</span>
              <strong>{loading ? '…' : stats.inProgressRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Approved</span>
              <strong>{loading ? '…' : stats.approvedRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Resolved</span>
              <strong>{loading ? '…' : stats.resolvedRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Rejected</span>
              <strong>{loading ? '…' : stats.rejectedRequests}</strong>
            </div>
          </section>

          <section className="service-grid dashboard-grid">
            <Link className="service-card dash-card" to="/leave">
              <div className="icon-wrap">
                <i className="fas fa-user-check"></i>
              </div>
              <h3>Apply Leave</h3>
              <p>Submit a leave request.</p>
            </Link>
            <Link className="service-card dash-card" to="/od">
              <div className="icon-wrap">
                <i className="fas fa-calendar-days"></i>
              </div>
              <h3>Apply OD</h3>
              <p>Submit an on-duty form.</p>
            </Link>
            <Link className="service-card dash-card" to="/bonafide">
              <div className="icon-wrap">
                <i className="fas fa-file-alt"></i>
              </div>
              <h3>Bonafide</h3>
              <p>Request a certificate.</p>
            </Link>
            <Link className="service-card dash-card" to="/complaint">
              <div className="icon-wrap">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Complaint</h3>
              <p>Report issues and concerns.</p>
            </Link>
            <Link className="service-card dash-card" to="/appointments/book">
              <div className="icon-wrap">
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3>Book appointment</h3>
              <p>Meet with your Principal, HOD or faculty.</p>
            </Link>
            <Link className="service-card dash-card" to="/appointments">
              <div className="icon-wrap">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <h3>My appointments</h3>
              <p>Review appointment requests and download approved events.</p>
            </Link>
            <Link className="service-card dash-card" to="/status">
              <div className="icon-wrap">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Track Requests</h3>
              <p>Monitor request status.</p>
            </Link>
            <Link className="service-card dash-card" to="/profile">
              <div className="icon-wrap">
                <i className="fas fa-user"></i>
              </div>
              <h3>My Profile</h3>
              <p>View and edit profile.</p>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
