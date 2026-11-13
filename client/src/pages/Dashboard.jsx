import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StudentHeader from '../components/StudentHeader';
import DemoBanner from '../components/DemoBanner';
import Skeleton from '../components/Skeleton';
import LoadError from '../components/LoadError';
import useLoading from '../hooks/useLoading';
import { useFeatures } from '../context/FeatureContext';
import AnnouncementsPanel from '../components/AnnouncementsPanel';

export default function Dashboard() {
  const { user } = useAuth();
  const { appointmentsEnabled } = useFeatures();
  const isStaff = ['faculty', 'hod', 'principal'].includes(user?.role);
  const staffServices = [
    {
      href: '/appointments/requests',
      title: 'Appointment requests',
      description: 'Review, approve, reject or reschedule student requests.',
    },
    {
      href: '/appointments/today',
      title: "Today's schedule",
      description: "View today's appointments and record outcomes.",
    },
    {
      href: '/appointments/availability',
      title: 'My availability',
      description: 'Set weekly meeting slots and blackout dates.',
    },
  ];
  const studentServices = [
    { href: '/leave', title: 'Apply for leave', description: 'Submit an academic leave request.' },
    { href: '/od', title: 'Apply for on-duty', description: 'Request approval for an official event.' },
    { href: '/bonafide', title: 'Bonafide certificate', description: 'Request an official student document.' },
    { href: '/complaint', title: 'Submit a complaint', description: 'Send a concern to the reviewing team.' },
    ...(appointmentsEnabled ? [
      { href: '/appointments/book', title: 'Appointment service', description: 'Book a meeting with your faculty or HOD.' },
      { href: '/appointments', title: 'My appointments', description: 'Review requests and approved events.' },
    ] : []),
    { href: '/status', title: 'Track requests', description: 'Check the latest status of submitted requests.' },
    { href: '/profile', title: 'My profile', description: 'View and update your student details.' },
  ];

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
            <section className="welcome card dashboard-welcome">
              <div>
                <span className="eyebrow">{user?.role}</span>
                <h2>Welcome, {user?.name || 'Staff member'}</h2>
                <p>Manage your student appointments and availability.</p>
              </div>
              <div className="profile-summary">
                <span>Department: {user?.department || 'Not set'}</span>
              </div>
            </section>
            <section className="dashboard-services card">
              <div className="dashboard-section-heading">
                <span className="section-kicker">STAFF WORKSPACE</span>
                <h2>Choose where to continue</h2>
              </div>
              <div className="dashboard-service-grid">
                {staffServices.map((service, index) => (
                  <Link className="dashboard-service-link" to={service.href} key={service.href}>
                    <span className="dashboard-service-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span className="dashboard-service-copy">
                      <strong>{service.title}</strong>
                      <small>{service.description}</small>
                    </span>
                    <span className="dashboard-service-arrow" aria-hidden="true">&rarr;</span>
                  </Link>
                ))}
              </div>
            </section>
            <AnnouncementsPanel />
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
          <section className="welcome card dashboard-welcome">
            <div>
              <span className="eyebrow">Welcome back</span>
              <h2>{user?.name || 'Student'}</h2>
              <p>Your campus requests, in one place.</p>
            </div>
            <div className="profile-summary">
              <span>Reg No: {user?.registerNumber || '--'}</span>
              <span>Dept: {user?.department || '--'}</span>
              <span>Year: {user?.year || '--'}</span>
            </div>
          </section>

          {error ? <LoadError message={error} onRetry={retry} /> : null}

          <section className="dashboard-overview card">
            <div className="dashboard-section-heading">
              <div>
                <h2>Your activity</h2>
              </div>
              {!loading && !error ? (
                <span className="dashboard-total">{stats.totalRequests} total requests</span>
              ) : null}
            </div>
            {error ? null : loading ? (
              <div className="stats-grid" aria-busy="true">
                <Skeleton variant="card" count={5} />
              </div>
            ) : (
              <div className="dashboard-status-grid">
                {[
                  ['Pending', stats.pendingRequests],
                  ['In progress', stats.inProgressRequests],
                  ['Approved', stats.approvedRequests],
                  ['Resolved', stats.resolvedRequests],
                  ['Rejected', stats.rejectedRequests],
                ].map(([label, value]) => (
                  <div className="dashboard-status" key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-services dashboard-services-student card">
            <div className="dashboard-section-heading dashboard-student-section-heading">
              <div>
                <h2>What would you like to do?</h2>
              </div>
              <p>Choose a service to submit a request or find an update.</p>
            </div>
            <div className="dashboard-service-grid">
              {studentServices.map((service, index) => (
                <Link className="dashboard-service-link" to={service.href} key={service.href}>
                  <span className="dashboard-service-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="dashboard-service-copy">
                    <strong>{service.title}</strong>
                    <small>{service.description}</small>
                  </span>
                  <span className="dashboard-service-arrow" aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </div>
          </section>
          <AnnouncementsPanel />
        </div>
      </main>
    </>
  );
}
