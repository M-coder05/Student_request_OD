import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StudentHeader from '../components/StudentHeader';
import DemoBanner from '../components/DemoBanner';
import Skeleton from '../components/Skeleton';
import LoadError from '../components/LoadError';
import useLoading from '../hooks/useLoading';

export default function Dashboard() {
  const { user } = useAuth();
  const isStaff = ['faculty', 'hod', 'principal'].includes(user?.role);

  const loadDashboard = useCallback(async () => {
    const result = await apiRequest('/student/dashboard');
    return {
      totalRequests: result.totalRequests ?? 0,
      pendingRequests: result.pendingRequests ?? 0,
      inProgressRequests: result.inProgressRequests ?? 0,
      approvedRequests: result.approvedRequests ?? 0,
      resolvedRequests: result.resolvedRequests ?? 0,
      rejectedRequests: result.rejectedRequests ?? 0,
    };
  }, []);
  const {
    data: stats,
    loading,
    error,
    retry,
  } = useLoading(loadDashboard, {
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    approvedRequests: 0,
    resolvedRequests: 0,
    rejectedRequests: 0,
  }, !isStaff);

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

          {error ? <LoadError message={error} onRetry={retry} /> : null}

          <section className="stats-grid">
            {error ? null : loading ? (
              <Skeleton variant="card" count={6} />
            ) : (
              [
                ['Total Requests', stats.totalRequests],
                ['Pending', stats.pendingRequests],
                ['In Progress', stats.inProgressRequests],
                ['Approved', stats.approvedRequests],
                ['Resolved', stats.resolvedRequests],
                ['Rejected', stats.rejectedRequests],
              ].map(([label, value]) => (
                <div className="stat-card" key={label}>
                  <span className="stat-label">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))
            )}
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
