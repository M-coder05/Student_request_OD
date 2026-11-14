import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StudentHeader from '../components/StudentHeader';
import ButtonLoader from '../components/ButtonLoader';
import { staffRoleLabel } from '../components/StaffIdentity';
import { displayDepartment } from '../constants/departments';

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

const staffOptionLabel = (member) => {
  const title = member.designation || staffRoleLabel(member.role);
  const departmentName = displayDepartment(member.department);
  const nameAndTitle = title ? `${member.name}, ${title}` : member.name;
  return departmentName ? `${nameAndTitle} (${departmentName})` : nameAndTitle;
};

export default function BookAppointment() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const preferredStaffIdRef = useRef(searchParams.get('staff') || '');

  const department = user?.department || '';

  const selectedStaff = useMemo(
    () => staff.find((member) => member._id === staffId),
    [staff, staffId]
  );

  const purposeMinimum = selectedStaff?.role === 'principal' ? 30 : 10;

  useEffect(() => {
    let active = true;
    setStaff([]);
    setStaffId('');
    setSlots([]);
    setStartTime('');
    setLoadingStaff(true);
    const query = new URLSearchParams();
    if (department) query.set('department', department);
    const queryString = query.toString();
    apiRequest(`/appointments/staff${queryString ? `?${queryString}` : ''}`)
      .then((result) => {
        if (!active) return;
        const availableStaff = [...(result.staff || [])].sort((a, b) => a.name.localeCompare(b.name));
        setStaff(availableStaff);
        const preferredStaff = preferredStaffIdRef.current
          ? availableStaff.find((member) => String(member._id) === String(preferredStaffIdRef.current))
          : null;
        setStaffId(preferredStaff ? preferredStaff._id : (availableStaff[0]?._id || ''));
        preferredStaffIdRef.current = '';
      })
      .catch((error) => showToast(error.message || 'Unable to load staff', 'error'))
      .finally(() => {
        if (active) setLoadingStaff(false);
      });
    return () => {
      active = false;
    };
  }, [department, showToast]);

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
      <main className="container form-page">
        <form className="card form-card appointment-card" onSubmit={submit}>
          <h2>Book an appointment</h2>
          <p className="muted appointment-intro">Choose a staff member, then pick a free time on the date you need.</p>
          <div className="appointment-form">
            <div className="field-wrap">
              <label htmlFor="appointmentStaff">Staff member</label>
              {!loadingStaff && !staff.length ? (
                <p className="muted">No staff in your department have set their availability yet.</p>
              ) : (
                <select id="appointmentStaff" value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={loadingStaff || !staff.length}>
                  {loadingStaff ? <option value="">Loading staff…</option> : null}
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {staffOptionLabel(member)}
                    </option>
                  ))}
                </select>
              )}
              {selectedStaff ? (
                <div className="staff-selection-detail">
                  <span>
                    {selectedStaff.name} · {selectedStaff.designation || staffRoleLabel(selectedStaff.role)}
                    {selectedStaff.role === 'faculty' || selectedStaff.role === 'hod'
                      ? (selectedStaff.department
                        ? ` · Department: ${displayDepartment(selectedStaff.department)}`
                        : ' · Department not set')
                      : ''}
                  </span>
                  {selectedStaff.officeLocation ? <span>Office: {selectedStaff.officeLocation}</span> : null}
                  {selectedStaff.officeHours ? <span>Office hours: {selectedStaff.officeHours}</span> : null}
                </div>
              ) : null}
              <Link className="text-link staff-directory-link" to="/appointments/staff">
                See all staff details
              </Link>
            </div>
            <div className="field-wrap">
              <label htmlFor="appointmentDate">Date</label>
              <input id="appointmentDate" type="date" min={todayInKolkata()} value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <section className="field-wrap appointment-times" aria-labelledby="appointmentTimesLabel">
              <div>
                <h3 id="appointmentTimesLabel" className="appointment-times-label">Available times</h3>
                <small id="appointmentTimezone" className="muted">Times are shown in Asia/Kolkata.</small>
              </div>
              {loadingSlots ? <p className="muted appointment-times-message" role="status">Loading times...</p> : null}
              {!loadingSlots && date && !slots.length ? <p className="muted appointment-times-message">No free times on this date. Try another day.</p> : null}
              {!loadingSlots && slots.length ? (
                <div className="appointment-slot-grid" role="radiogroup" aria-labelledby="appointmentTimesLabel" aria-describedby="appointmentTimezone">
                  {slots.map((slot) => (
                    <label key={slot.startTime} className="appointment-slot">
                      <input
                        type="radio"
                        name="appointmentTime"
                        value={slot.startTime}
                        checked={startTime === slot.startTime}
                        onChange={() => setStartTime(slot.startTime)}
                      />
                      <span>{slot.startTime}–{slot.endTime}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>
            <div className="field-wrap appointment-purpose">
              <label htmlFor="appointmentPurpose">Purpose</label>
              <textarea id="appointmentPurpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} minLength={purposeMinimum} maxLength={300} rows={4} required aria-describedby="appointmentPurposeRules appointmentPurposeCount" />
              <div className="appointment-purpose-meta">
                <small id="appointmentPurposeRules" className="muted">
                  Minimum {purposeMinimum} characters; maximum 300 characters.
                </small>
                <small id="appointmentPurposeCount" className="appointment-purpose-count" aria-live="polite">{purpose.length}/300</small>
              </div>
            </div>
            <ButtonLoader
              type="submit"
              className="btn btn-primary"
              loading={submitting}
              disabled={!staffId || !date || !startTime}
              loadingText="Requesting..."
            >
              Request appointment
            </ButtonLoader>
          </div>
        </form>
      </main>
    </>
  );
}
