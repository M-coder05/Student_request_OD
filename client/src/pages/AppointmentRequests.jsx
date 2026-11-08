import React, { useCallback, useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StatusBadge from '../components/StatusBadge';
import StudentHeader from '../components/StudentHeader';
import { formatDate } from '../utils/formatDate';
import Skeleton from '../components/Skeleton';
import LoadError from '../components/LoadError';
import ButtonLoader from '../components/ButtonLoader';
import useLoading from '../hooks/useLoading';

export default function AppointmentRequests() {
  const { showToast } = useToast();
  const loadAppointments = useCallback(async () => {
    const result = await apiRequest('/appointments/staff-queue');
    return result.appointments || [];
  }, []);
  const {
    data: appointments,
    loading,
    error,
    retry,
  } = useLoading(loadAppointments, []);
  const [action, setAction] = useState(null);
  const [selectedTab, setSelectedTab] = useState('All');

  const counts = {
    All: appointments.length,
    Pending: appointments.filter((appointment) => appointment.status === 'Pending').length,
    Approved: appointments.filter((appointment) => appointment.status === 'Approved').length,
  };
  const visibleAppointments = selectedTab === 'All'
    ? appointments
    : appointments.filter((appointment) => appointment.status === selectedTab);

  const decide = async (appointment, decision) => {
    let remark = window.prompt('Add a remark (optional):', '');
    if (remark === null) return;
    const body = { decision, remark };
    if (decision === 'reschedule') {
      const newDate = window.prompt('New date (YYYY-MM-DD):', appointment.date);
      if (!newDate) return;
      const newStartTime = window.prompt('New start time (HH:mm):', appointment.startTime);
      if (!newStartTime) return;
      body.newDate = newDate;
      body.newStartTime = newStartTime;
    }
    try {
      setAction({ id: appointment._id, decision });
      await apiRequest(`/appointments/${appointment._id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      showToast({
        approve: 'Appointment approved',
        reject: 'Appointment rejected',
        reschedule: 'Appointment rescheduled',
      }[decision]);
      await retry();
    } catch (error) {
      showToast(error.message || 'Unable to update appointment', 'error');
    } finally {
      setAction(null);
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Appointment requests" />
      <main className="page-shell">
        <div className="container">
          <section className="card staff-page-card">
            <h2>Appointment requests</h2>
            {error ? <LoadError message={error} onRetry={retry} /> : null}
            {loading ? (
              <div className="table-wrap">
                <table>
                  <tbody aria-busy="true">
                    <Skeleton variant="table-row" count={4} columns={7} />
                  </tbody>
                </table>
              </div>
            ) : null}
            {!loading && !error ? (
              <>
                <div className="appointment-request-tabs" role="tablist" aria-label="Filter appointment requests">
                  {['All', 'Pending', 'Approved'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`appointment-request-tab${selectedTab === tab ? ' appointment-request-tab-selected' : ''}`}
                      role="tab"
                      aria-selected={selectedTab === tab}
                      onClick={() => setSelectedTab(tab)}
                    >
                      {tab} ({counts[tab]})
                    </button>
                  ))}
                </div>
                {!visibleAppointments.length ? (
                  <p className="muted">
                    {selectedTab === 'All'
                      ? 'No appointment requests yet. Student bookings will appear here.'
                      : selectedTab === 'Pending'
                        ? 'No pending requests.'
                        : 'No approved appointments.'}
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Student</th><th>Department</th><th>Date &amp; time</th><th>Purpose</th><th>Status</th><th>Remark</th><th>Actions</th></tr></thead>
                      <tbody>
                        {visibleAppointments.map((appointment) => (
                          <tr key={appointment._id}>
                            <td>{appointment.studentName}<br /><small>{appointment.registerNumber}</small></td>
                            <td>{appointment.department}</td>
                            <td>{formatDate(appointment.date)}<br />{appointment.startTime}–{appointment.endTime}</td>
                            <td>{appointment.purpose}</td>
                            <td><StatusBadge status={appointment.status} /></td>
                            <td>{appointment.staffRemark || <span className="muted">No remark</span>}</td>
                            <td>
                              {appointment.status === 'Pending' ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  <ButtonLoader
                                    type="button"
                                    className="btn btn-primary"
                                    loading={action?.id === appointment._id && action.decision === 'approve'}
                                    disabled={Boolean(action)}
                                    loadingText="Approving…"
                                    onClick={() => decide(appointment, 'approve')}
                                  >
                                    Approve
                                  </ButtonLoader>
                                  <ButtonLoader
                                    type="button"
                                    className="btn btn-secondary"
                                    loading={action?.id === appointment._id && action.decision === 'reject'}
                                    disabled={Boolean(action)}
                                    loadingText="Rejecting…"
                                    onClick={() => decide(appointment, 'reject')}
                                  >
                                    Reject
                                  </ButtonLoader>
                                  <button type="button" className="btn btn-secondary" onClick={() => decide(appointment, 'reschedule')}>Reschedule</button>
                                </div>
                              ) : <span className="muted">No actions</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
