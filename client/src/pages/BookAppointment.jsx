import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StudentHeader from '../components/StudentHeader';
import ButtonLoader from '../components/ButtonLoader';

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

export default function BookAppointment() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staffRole, setStaffRole] = useState('faculty');
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const department = useMemo(
    () => (staffRole === 'principal' ? '' : user?.department || ''),
    [staffRole, user?.department]
  );

  useEffect(() => {
    let active = true;
    setStaff([]);
    setStaffId('');
    setSlots([]);
    setStartTime('');
    setLoadingStaff(true);
    const query = new URLSearchParams({ role: staffRole });
    if (department) query.set('department', department);
    apiRequest(`/appointments/staff?${query}`)
      .then((result) => {
        if (!active) return;
        const availableStaff = result.staff || [];
        setStaff(availableStaff);
        setStaffId(availableStaff[0]?._id || '');
      })
      .catch((error) => showToast(error.message || 'Unable to load staff', 'error'))
      .finally(() => {
        if (active) setLoadingStaff(false);
      });
    return () => {
      active = false;
    };
  }, [staffRole, department, showToast]);

  useEffect(() => {
    if (!staffId || !date) {
      setSlots([]);
      setStartTime('');
      return undefined;
    }
    let active = true;
    setSlots([]);
    setStartTime('');
    setLoadingSlots(true);
    apiRequest(`/appointments/staff/${staffId}/slots?date=${encodeURIComponent(date)}`)
      .then((result) => {
        if (active) setSlots(result.slots || []);
      })
      .catch((error) => showToast(error.message || 'Unable to load available slots', 'error'))
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [staffId, date, showToast]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify({ staffId, date, startTime, purpose }),
      });
      showToast('Appointment request submitted');
      setPurpose('');
      setStartTime('');
      const result = await apiRequest(`/appointments/staff/${staffId}/slots?date=${encodeURIComponent(date)}`);
      setSlots(result.slots || []);
    } catch (error) {
      showToast(error.message || 'Unable to book appointment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Book appointment" />
      <main className="page-shell">
        <div className="container">
          <section className="card" style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
            <h2>Book an appointment</h2>
            <p className="muted">Choose a Principal/HOD appointment or a faculty meeting.</p>
            <form onSubmit={submit}>
              <div className="form-group">
                <label htmlFor="appointmentStaffRole">Appointment with</label>
                <select id="appointmentStaffRole" value={staffRole} onChange={(event) => setStaffRole(event.target.value)}>
                  <option value="faculty">Faculty</option>
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="principal">Principal</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="appointmentStaff">Staff member</label>
                <select id="appointmentStaff" value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={loadingStaff || !staff.length}>
                  {loadingStaff ? <option value="">Loading staff…</option> : null}
                  {!loadingStaff && !staff.length ? <option value="">No staff available</option> : null}
                  {staff.map((member) => <option key={member._id} value={member._id}>{member.name} — {member.department}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="appointmentDate">Date</label>
                <input id="appointmentDate" type="date" min={todayInKolkata()} value={date} onChange={(event) => setDate(event.target.value)} required />
              </div>
              <fieldset className="form-group">
                <legend>Available times (Asia/Kolkata)</legend>
                {loadingSlots ? <p className="muted">Loading available slots…</p> : null}
                {!loadingSlots && date && !slots.length ? <p className="muted">No free slots are available on this date.</p> : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      className={`btn ${startTime === slot.startTime ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setStartTime(slot.startTime)}
                      aria-pressed={startTime === slot.startTime}
                    >
                      {slot.startTime}–{slot.endTime}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="form-group">
                <label htmlFor="appointmentPurpose">Purpose</label>
                <textarea id="appointmentPurpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} minLength={staffRole === 'principal' ? 30 : 10} maxLength={300} rows={4} required />
                <small className="muted">{purpose.length}/300 characters{staffRole === 'principal' ? ' (minimum 30 for Principal appointments)' : ''}</small>
              </div>
              <ButtonLoader
                type="submit"
                className="btn btn-primary"
                loading={submitting}
                disabled={!staffId || !date || !startTime}
                loadingText="Submitting…"
              >
                Request appointment
              </ButtonLoader>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
