import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StatusBadge from '../components/StatusBadge';
import StudentHeader from '../components/StudentHeader';
import { formatDate } from '../utils/formatDate';

const todayInKolkata = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export default function AppointmentSchedule() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await apiRequest(`/appointments/staff-queue?date=${todayInKolkata()}`);
      setAppointments(result.appointments || []);
    } catch (error) {
      showToast(error.message || 'Unable to load today’s schedule', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setOutcome = async (appointment, outcome) => {
    const remark = window.prompt('Add a remark (optional):', '');
    if (remark === null) return;
    try {
      await apiRequest(`/appointments/${appointment._id}/${outcome}`, {
        method: 'PATCH',
        body: JSON.stringify({ remark }),
      });
      showToast(outcome === 'complete' ? 'Appointment completed' : 'Appointment marked no-show');
      await reload();
    } catch (error) {
      showToast(error.message || 'Unable to update appointment', 'error');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Today’s schedule" />
      <main className="page-shell">
        <div className="container">
          <section className="card staff-page-card">
            <h2>Today’s schedule</h2>
            <p className="muted">{formatDate(todayInKolkata())}</p>
            {loading ? <p>Loading schedule…</p> : null}
            {!loading && !appointments.length ? <p className="muted">No approved appointments today.</p> : null}
            {!loading && appointments.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Student</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment._id}>
                        <td>{appointment.startTime}–{appointment.endTime}</td>
                        <td>{appointment.studentName}<br /><small>{appointment.registerNumber}</small></td>
                        <td>{appointment.purpose}</td>
                        <td><StatusBadge status={appointment.status} /></td>
                        <td>
                          {['Approved', 'Rescheduled'].includes(appointment.status) ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" className="btn btn-primary" onClick={() => setOutcome(appointment, 'complete')}>Complete</button>
                              <button type="button" className="btn btn-secondary" onClick={() => setOutcome(appointment, 'no-show')}>No-show</button>
                            </div>
                          ) : <span className="muted">No actions</span>}
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
