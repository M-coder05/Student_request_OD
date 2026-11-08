import React, { useCallback, useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import StudentHeader from '../components/StudentHeader';
import ButtonLoader from '../components/ButtonLoader';
import LoadError from '../components/LoadError';
import Skeleton from '../components/Skeleton';
import useLoading from '../hooks/useLoading';
import { formatDate } from '../utils/formatDate';

export default function AnnouncementsAdmin() {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const loadAnnouncements = useCallback(async () => {
    const result = await apiRequest('/announcements/manage');
    return result.announcements || [];
  }, []);
  const {
    data: announcements,
    loading,
    error,
    retry,
  } = useLoading(loadAnnouncements, []);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title,
          message,
          audience,
          pinned,
          ...(expiresAt ? { expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString() } : {}),
        }),
      });
      setTitle('');
      setMessage('');
      setAudience('all');
      setPinned(false);
      setExpiresAt('');
      showToast('Announcement published');
      await retry();
    } catch (requestError) {
      showToast(requestError.message || 'Unable to publish announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    setDeletingId(announcement._id);
    try {
      await apiRequest(`/announcements/${announcement._id}`, { method: 'DELETE' });
      showToast('Announcement deleted');
      await retry();
    } catch (requestError) {
      showToast(requestError.message || 'Unable to delete announcement', 'error');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Announcements" />
      <main className="page-shell">
        <div className="container">
          <section className="card announcement-admin-card">
            <h2>Post an announcement</h2>
            <form className="announcement-form" onSubmit={submit}>
              <label className="announcement-form-field">
                Title
                <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
              </label>
              <label className="announcement-form-field announcement-message-field">
                Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={5} required />
                <small className="muted">{message.length}/1000 characters</small>
              </label>
              <label className="announcement-form-field">
                Audience
                <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                  <option value="all">Everyone</option>
                  <option value="students">Students</option>
                  <option value="staff">Staff</option>
                </select>
              </label>
              <label className="announcement-checkbox">
                <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
                Pin to top
              </label>
              <label className="announcement-form-field">
                Optional expiry date
                <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              </label>
              <ButtonLoader type="submit" className="btn btn-primary" loading={submitting} loadingText="Publishing...">
                Publish announcement
              </ButtonLoader>
            </form>
          </section>

          <section className="card announcement-admin-card">
            <h2>Manage announcements</h2>
            {error ? <LoadError message={error} onRetry={retry} /> : null}
            {loading ? <div aria-busy="true"><Skeleton variant="list-item" count={3} /></div> : null}
            {!loading && !error && !announcements.length ? <p className="muted">No announcements yet.</p> : null}
            {!loading && !error && announcements.length ? (
              <div className="announcements-list">
                {announcements.map((announcement) => {
                  const expired = announcement.expiresAt && new Date(announcement.expiresAt).getTime() <= Date.now();
                  return (
                    <article className="announcement-item" key={announcement._id}>
                      <div className="announcement-item-heading">
                        <h3>{announcement.title}</h3>
                        {announcement.pinned ? <span className="announcement-pinned">Pinned</span> : null}
                        {expired ? <span className="announcement-expired">Expired</span> : null}
                      </div>
                      <p>{announcement.message}</p>
                      <small>{formatDate(announcement.createdAt)} · {announcement.audience}</small>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={Boolean(deletingId)}
                        onClick={() => deleteAnnouncement(announcement)}
                      >
                        {deletingId === announcement._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
