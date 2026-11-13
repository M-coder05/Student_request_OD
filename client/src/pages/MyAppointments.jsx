import React, { useCallback, useEffect, useState } from 'react';
import { apiDownload, apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StatusBadge from '../components/StatusBadge';
import StudentHeader from '../components/StudentHeader';
import { formatDate } from '../utils/formatDate';

const ACTIVE_STATUSES = ['Pending', 'Approved', 'Rescheduled'];

export default function MyAppointments() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = useCallback(async () => {
    try {
      const result = await apiRequest('/appointments/mine');
      setAppointments(result.appointments || []);
    } catch (error) {
      showToast(error.message || 'Unable to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const cancel = async (appointment) => {
    try {
      await apiRequest(`/appointments/${appointment._id}/cancel`, { method: 'PATCH' });
      showToast('Appointment cancelled');
      await loadAppointments();
    } catch (error) {
      showToast(error.message || 'Unable to cancel appointment', 'error');
    }
  };

  const downloadCalendar = async (appointment) => {
    try {
      const calendar = await apiDownload(`/appointments/${appointment._id}/calendar`);
      const url = URL.createObjectURL(calendar);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${appointment.appointmentId}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || 'Unable to download calendar file', 'error');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="My appointments" />
      <main className="page-shell">
        <div className="container">
          <section className="card">
            <h2>My appointments</h2>
            {loading ? <p>Loading appointments…</p> : null}
            {!loading && appointments.length === 0 ? <p className="muted">You have no appointments yet.</p> : null}
            {!loading && appointments.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Appointment</th><th>Staff</th><th>Date &amp; time</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment._id}>
                        <td>{appointment.appointmentId}</td>
                        <td>
                          {appointment.staffName} ({appointment.staffRole})
                          {appointment.staffDepartment ? (
                            <>
                              <br />
                              <small className="muted">Department: {appointment.staffDepartment}</small>
                            </>
                          ) : null}
                        </td>
                        <td>{formatDate(appointment.date)}<br />{appointment.startTime}–{appointment.endTime} IST</td>
                        <td>{appointment.purpose}</td>
                        <td><StatusBadge status={appointment.status} /></td>
                        <td>
                          {ACTIVE_STATUSES.includes(appointment.status) ? (
                            <button type="button" className="btn btn-secondary" onClick={() => cancel(appointment)}>Cancel</button>
                          ) : null}
                          {['Approved', 'Rescheduled'].includes(appointment.status) ? (
                            <button type="button" className="btn btn-secondary" onClick={() => downloadCalendar(appointment)}>Download .ics</button>
                          ) : null}
                          {!ACTIVE_STATUSES.includes(appointment.status) && !['Approved', 'Rescheduled'].includes(appointment.status) ? '—' : null}
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
