import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StatusBadge from '../components/StatusBadge';
import StudentHeader from '../components/StudentHeader';
import { formatDate } from '../utils/formatDate';

export default function AppointmentRequests() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await apiRequest('/appointments/staff-queue');
      setAppointments(result.appointments || []);
    } catch (error) {
      showToast(error.message || 'Unable to load appointment requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

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
      await apiRequest(`/appointments/${appointment._id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      showToast({
        approve: 'Appointment approved',
        reject: 'Appointment rejected',
        reschedule: 'Appointment rescheduled',
      }[decision]);
      await reload();
    } catch (error) {
      showToast(error.message || 'Unable to update appointment', 'error');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Appointment requests" />
      <main className="page-shell">
        <div className="container">
          <section className="card">
            <h2>Appointment requests</h2>
            {loading ? <p>Loading requests…</p> : null}
            {!loading && !appointments.length ? <p className="muted">No appointment requests.</p> : null}
            {!loading && appointments.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Department</th><th>Date &amp; time</th><th>Purpose</th><th>Status</th><th>Remark</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment._id}>
                        <td>{appointment.studentName}<br /><small>{appointment.registerNumber}</small></td>
                        <td>{appointment.department}</td>
                        <td>{formatDate(appointment.date)}<br />{appointment.startTime}–{appointment.endTime}</td>
                        <td>{appointment.purpose}</td>
                        <td><StatusBadge status={appointment.status} /></td>
                        <td>{appointment.staffRemark || '—'}</td>
                        <td>
                          {appointment.status === 'Pending' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              <button type="button" className="btn btn-primary" onClick={() => decide(appointment, 'approve')}>Approve</button>
                              <button type="button" className="btn btn-secondary" onClick={() => decide(appointment, 'reject')}>Reject</button>
                              <button type="button" className="btn btn-secondary" onClick={() => decide(appointment, 'reschedule')}>Reschedule</button>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
