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

  const save = async (event) => {
    event.preventDefault();
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
          <section className="card">
            <h2>Weekly availability</h2>
            {loading ? <p>Loading availability…</p> : (
              <form onSubmit={save}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Weekday</th><th>Available</th><th>Start</th><th>End</th><th>Slot length</th></tr></thead>
                    <tbody>
                      {availability.map((entry) => (
                        <tr key={entry.weekday}>
                          <td>{WEEKDAYS[entry.weekday]}</td>
                          <td><input type="checkbox" checked={entry.active} onChange={(event) => updateDay(entry.weekday, 'active', event.target.checked)} aria-label={`${WEEKDAYS[entry.weekday]} active`} /></td>
                          <td><input type="time" value={entry.startTime} onChange={(event) => updateDay(entry.weekday, 'startTime', event.target.value)} disabled={!entry.active} /></td>
                          <td><input type="time" value={entry.endTime} onChange={(event) => updateDay(entry.weekday, 'endTime', event.target.value)} disabled={!entry.active} /></td>
                          <td>
                            <select value={entry.slotMinutes} onChange={(event) => updateDay(entry.weekday, 'slotMinutes', Number(event.target.value))} disabled={!entry.active}>
                              {[10, 15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn-primary" type="submit">Save availability</button>
              </form>
            )}
          </section>

          <section className="card" style={{ marginTop: 24 }}>
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
