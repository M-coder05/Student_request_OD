import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import DemoBanner from '../components/DemoBanner';
import StudentHeader from '../components/StudentHeader';
import Skeleton from '../components/Skeleton';
import LoadError from '../components/LoadError';
import useLoading from '../hooks/useLoading';

export default function StaffDirectory() {
  const { user } = useAuth();
  const department = user?.department || '';
  const loadStaff = useCallback(async () => {
    const query = department ? `?department=${encodeURIComponent(department)}` : '';
    const result = await apiRequest(`/appointments/staff${query}`);
    return result.staff || [];
  }, [department]);
  const {
    data: staff,
    loading,
    error,
    retry,
  } = useLoading(loadStaff, []);

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Staff details" />
      <main className="page-shell">
        <div className="container">
          <section className="card staff-directory">
            <h2>Staff available for appointments</h2>
            <p className="muted staff-directory-intro">
              See where each staff member sits, when they are free, and what they can meet about.
            </p>
            {error ? <LoadError message={error} onRetry={retry} /> : null}
            {loading ? (
              <div aria-busy="true">
                <Skeleton variant="list-item" count={3} />
              </div>
            ) : null}
            {!loading && !error && !staff.length ? (
              <p className="muted">No staff are available for booking yet.</p>
            ) : null}
            {!loading && !error && staff.length ? (
              <ul className="staff-directory-list">
                {staff.map((member) => (
                  <li className="staff-directory-item" key={member._id}>
                    <div className="staff-directory-copy">
                      <h3>{member.name}</h3>
                      {member.designation ? (
                        <p className="staff-directory-designation">{member.designation}</p>
                      ) : null}
                      {member.department ? <p>Department: {member.department}</p> : null}
                      {member.officeLocation ? <p>Office: {member.officeLocation}</p> : null}
                      {member.officeHours ? <p>Office hours: {member.officeHours}</p> : null}
                      {member.meetingTopics ? <p>Meeting topics: {member.meetingTopics}</p> : null}
                    </div>
                    <Link className="staff-directory-book" to={`/appointments/book?staff=${member._id}`}>
                      Book
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
