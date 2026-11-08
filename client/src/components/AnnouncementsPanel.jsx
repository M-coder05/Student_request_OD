import React, { useCallback } from 'react';
import { apiRequest } from '../api/client';
import LoadError from './LoadError';
import Skeleton from './Skeleton';
import useLoading from '../hooks/useLoading';
import { formatDate } from '../utils/formatDate';

export default function AnnouncementsPanel() {
  const loadAnnouncements = useCallback(async () => {
    const result = await apiRequest('/announcements');
    return result.announcements || [];
  }, []);
  const {
    data: announcements,
    loading,
    error,
    retry,
  } = useLoading(loadAnnouncements, []);

  return (
    <section className="card announcements-panel">
      <div className="dashboard-section-heading">
        <div>
          <span className="section-kicker">ANNOUNCEMENTS</span>
          <h2>Latest announcements</h2>
        </div>
      </div>
      {error ? <LoadError message={error} onRetry={retry} /> : null}
      {loading ? <div aria-busy="true"><Skeleton variant="list-item" count={2} /></div> : null}
      {!loading && !error && !announcements.length ? (
        <p className="muted">No announcements right now.</p>
      ) : null}
      {!loading && !error && announcements.length ? (
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <article className="announcement-item" key={announcement._id}>
              <div className="announcement-item-heading">
                <h3>{announcement.title}</h3>
                {announcement.pinned ? <span className="announcement-pinned">Pinned</span> : null}
              </div>
              <p>{announcement.message}</p>
              <small>{formatDate(announcement.createdAt)}</small>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
