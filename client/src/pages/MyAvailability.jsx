import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StudentHeader from '../components/StudentHeader';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const defaultAvailability = () => WEEKDAYS.map((_, weekday) => ({
  weekday,
  active: false,
  startTime: '09:00',
  endTime: '17:00',
  slotMinutes: 30,
}));

export default function MyAvailability() {
  const { showToast } = useToast();
  const [availability, setAvailability] = useState(defaultAvailability);
  const [blackouts, setBlackouts] = useState([]);
  const [blackoutDate, setBlackoutDate] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const reload = useCallback(async () => {
    const result = await apiRequest('/availability/me');
    const savedByDay = new Map((result.availability || []).map((entry) => [entry.weekday, entry]));
    setAvailability(defaultAvailability().map((entry) => ({ ...entry, ...(savedByDay.get(entry.weekday) || {}) })));
    setBlackouts(result.blackouts || []);
  }, []);

  useEffect(() => {
    reload()
      .catch((error) => showToast(error.message || 'Unable to load availability', 'error'))
      .finally(() => setLoading(false));
  }, [reload, showToast]);

  const updateDay = (weekday, field, value) => {
    setAvailability((current) => current.map((entry) => (
      entry.weekday === weekday ? { ...entry, [field]: value } : entry
    )));
  };

  const copyMondayToWeekdays = () => {
    const monday = availability.find((entry) => entry.weekday === 1);
    setAvailability((current) => current.map((entry) => (
      entry.weekday >= 2 && entry.weekday <= 5
        ? {
            ...entry,
            active: true,
            startTime: monday.startTime,
            endTime: monday.endTime,
            slotMinutes: monday.slotMinutes,
          }
        : entry
    )));
  };

  const getRowError = (entry) => {
    if (!entry.active) return '';
    const [startHour, startMinute] = entry.startTime.split(':').map(Number);
    const [endHour, endMinute] = entry.endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (end <= start) return 'End time must be after start time.';
    if (end - start < entry.slotMinutes) return 'At least one slot must fit between the start and end times.';
    return '';
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setShowValidationErrors(true);
    if (availability.some(getRowError)) return;
    if (!availability.some((entry) => entry.active)
      && !window.confirm("No days are selected. Students won't be able to book you. Save anyway?")) return;

    setSaving(true);
    try {
      const result = await apiRequest('/availability/me', {
        method: 'PUT',
        body: JSON.stringify({ availability }),
      });
      setAvailability(defaultAvailability().map((entry) => ({
        ...entry,
        ...(result.availability || []).find((saved) => saved.weekday === entry.weekday),
      })));
      showToast('Availability saved');
    } catch (error) {
      showToast(error.message || 'Unable to save availability', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBlackout = async (event) => {
    event.preventDefault();
    try {
      await apiRequest('/availability/me/blackouts', {
        method: 'POST',
        body: JSON.stringify({ date: blackoutDate, reason: blackoutReason }),
      });
      setBlackoutDate('');
      setBlackoutReason('');
      await reload();
      showToast('Blackout date added');
    } catch (error) {
      showToast(error.message || 'Unable to add blackout date', 'error');
    }
  };

  const removeBlackout = async (id) => {
    try {
      await apiRequest(`/availability/me/blackouts/${id}`, { method: 'DELETE' });
      await reload();
      showToast('Blackout date removed');
    } catch (error) {
      showToast(error.message || 'Unable to remove blackout date', 'error');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="My availability" />
      <main className="page-shell">
        <div className="container">
          <section className="card availability-card">
            <header className="availability-heading">
              <div>
                <h2>Weekly availability</h2>
                <p>Students can only book the days and times you set here.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={copyMondayToWeekdays} disabled={loading || saving}>
                Copy Monday to all weekdays
              </button>
            </header>
            {loading ? <p>Loading availability…</p> : (
              <form onSubmit={save}>
                <div className="table-wrap availability-table-wrap">
                  <table className="availability-table">
                    <thead><tr><th>Weekday</th><th>Available</th><th>Start</th><th>End</th><th>Slot length</th></tr></thead>
                    <tbody>
                      {availability.map((entry) => (
                        <React.Fragment key={entry.weekday}>
                          <tr className={!entry.active ? 'availability-row-disabled' : ''}>
                            <td data-label="Weekday">{WEEKDAYS[entry.weekday]}</td>
                            <td data-label="Available">
                              <label className="availability-checkbox">
                                <input type="checkbox" checked={entry.active} onChange={(event) => updateDay(entry.weekday, 'active', event.target.checked)} aria-label={`Available on ${WEEKDAYS[entry.weekday]}`} />
                              </label>
                            </td>
                            <td data-label="Start">
                              <input id={`availability-start-${entry.weekday}`} type="time" value={entry.startTime} onChange={(event) => updateDay(entry.weekday, 'startTime', event.target.value)} disabled={!entry.active} aria-invalid={Boolean(showValidationErrors && getRowError(entry))} aria-describedby={showValidationErrors && getRowError(entry) ? `availability-error-${entry.weekday}` : undefined} />
                            </td>
                            <td data-label="End">
                              <input id={`availability-end-${entry.weekday}`} type="time" value={entry.endTime} onChange={(event) => updateDay(entry.weekday, 'endTime', event.target.value)} disabled={!entry.active} aria-invalid={Boolean(showValidationErrors && getRowError(entry))} aria-describedby={showValidationErrors && getRowError(entry) ? `availability-error-${entry.weekday}` : undefined} />
                            </td>
                            <td data-label="Slot length">
                              <select value={entry.slotMinutes} onChange={(event) => updateDay(entry.weekday, 'slotMinutes', Number(event.target.value))} disabled={!entry.active} aria-invalid={Boolean(showValidationErrors && getRowError(entry))} aria-describedby={showValidationErrors && getRowError(entry) ? `availability-error-${entry.weekday}` : undefined}>
                                {[10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                              </select>
                              {showValidationErrors && getRowError(entry) ? (
                                <span id={`availability-error-${entry.weekday}`} className="availability-row-error" role="alert">{getRowError(entry)}</span>
                              ) : null}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="availability-actions">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save availability'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card staff-page-card" style={{ marginTop: 24 }}>
            <h2>Blackout dates</h2>
            <form onSubmit={addBlackout} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
              <label>Date<input type="date" value={blackoutDate} onChange={(event) => setBlackoutDate(event.target.value)} required /></label>
              <label>Reason<input type="text" maxLength={200} value={blackoutReason} onChange={(event) => setBlackoutReason(event.target.value)} /></label>
              <button className="btn btn-primary" type="submit">Add blackout</button>
            </form>
            <ul>
              {blackouts.map((blackout) => (
                <li key={blackout._id}>
                  {blackout.date}{blackout.reason ? ` — ${blackout.reason}` : ''}
                  {' '}
                  <button type="button" className="btn btn-secondary" onClick={() => removeBlackout(blackout._id)}>Remove</button>
                </li>
              ))}
              {!blackouts.length ? <li className="muted">No blackout dates.</li> : null}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
