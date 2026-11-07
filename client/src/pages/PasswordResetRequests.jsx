import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import Modal from '../components/Modal';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatDate';

export default function PasswordResetRequests() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [working, setWorking] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) query.set('q', search.trim());
      const result = await apiRequest(`/admin/password-resets?${query}`);
      setRequests(result.requests || []);
      setPages(result.pages || 1);
      setTotal(result.total || 0);
    } catch (error) {
      showToast(error.message || 'Unable to load password reset requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  if (!['admin', 'super_admin'].includes(user?.role) || user?.demo === true) {
    return <Navigate to="/admin" replace />;
  }

  const closeModal = () => {
    if (working) return;
    setSelectedRequest(null);
    setIdentityVerified(false);
    setTemporaryPassword('');
  };

  const issueTemporaryPassword = async () => {
    if (!selectedRequest || !identityVerified || working) return;
    setWorking(true);
    try {
      const result = await apiRequest(`/admin/password-resets/${selectedRequest._id}/issue`, {
        method: 'POST',
        body: JSON.stringify({ identityVerified: true }),
      });
      setTemporaryPassword(result.temporaryPassword);
      showToast('Temporary password issued');
      await loadRequests();
    } catch (error) {
      showToast(error.message || 'Unable to issue a temporary password', 'error');
    } finally {
      setWorking(false);
    }
  };

  const dismissRequest = async (request) => {
    if (!window.confirm(`Dismiss the password reset request for ${request.user.name}?`)) return;
    try {
      await apiRequest(`/admin/password-resets/${request._id}/dismiss`, { method: 'POST' });
      showToast('Password reset request dismissed');
      await loadRequests();
    } catch (error) {
      showToast(error.message || 'Unable to dismiss password reset request', 'error');
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      showToast('Temporary password copied');
    } catch {
      showToast('Unable to copy the password. Select and copy it manually.', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  return (
    <>
      <DemoBanner />
      <header className="topbar inner-header">
        <div className="container nav-wrap">
          <div className="brand"><span className="brand-mark">SS</span><span>Password reset requests</span></div>
          <nav className="main-nav">
            <Link to="/admin">Admin dashboard</Link>
            {user.role === 'super_admin' ? <Link to="/admin/staff">Staff management</Link> : null}
          </nav>
          <div className="nav-actions">
            <NotificationBell />
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <div className="container">
          <section className="card admin-section password-reset-admin">
            <div className="admin-table-heading">
              <h3>Password reset requests</h3>
              <label className="admin-search-label" htmlFor="password-reset-search">Search requests</label>
              <input
                id="password-reset-search"
                type="search"
                placeholder="Name or register number"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <p className="password-reset-admin-note">
              Verify the account holder’s identity in person before issuing a temporary password.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Register number</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody aria-busy={loading}>
                  {loading ? (
                    <tr><td colSpan="5">Loading password reset requests…</td></tr>
                  ) : requests.length === 0 ? (
                    <tr><td colSpan="5" className="password-reset-empty">No password reset requests found.</td></tr>
                  ) : requests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.user?.name || 'Unknown account'}</td>
                      <td>{request.user?.registerNumber || '—'}</td>
                      <td>{formatDateTime(request.requestedAt)}</td>
                      <td><StatusBadge status={request.status} /></td>
                      <td>
                        {request.status === 'Pending' ? (
                          <div className="password-reset-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIdentityVerified(false);
                              }}
                            >
                              Issue temporary password
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => dismissRequest(request)}>
                              Dismiss
                            </button>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={pages}
              total={total}
              itemLabel="requests"
              onPrev={() => setPage((current) => Math.max(current - 1, 1))}
              onNext={() => setPage((current) => Math.min(current + 1, pages))}
            />
          </section>
        </div>
      </main>

      <Modal
        isOpen={Boolean(selectedRequest)}
        title={temporaryPassword ? 'Temporary password' : 'Verify identity'}
        onClose={closeModal}
        footer={temporaryPassword ? (
          <>
            <button type="button" className="btn btn-primary" onClick={copyPassword}>Copy password</button>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!identityVerified || working}
              onClick={issueTemporaryPassword}
            >
              {working ? 'Issuing…' : 'Issue temporary password'}
            </button>
          </>
        )}
      >
        {temporaryPassword ? (
          <>
            <p><strong>Important:</strong> This password is shown only once. Copy and share it securely now. The account holder must set a new password at next sign-in.</p>
            <code className="password-reset-temporary-password">{temporaryPassword}</code>
          </>
        ) : selectedRequest ? (
          <>
            <p>Verify {selectedRequest.user?.name} ({selectedRequest.user?.registerNumber}) before issuing a password.</p>
            <label className="password-reset-verify">
              <input
                type="checkbox"
                checked={identityVerified}
                onChange={(event) => setIdentityVerified(event.target.checked)}
              />
              <span>
                {selectedRequest.user?.role === 'student'
                  ? "I verified this student's ID in person"
                  : 'I verified this staff member’s ID in person'}
              </span>
            </label>
          </>
        ) : null}
      </Modal>
    </>
  );
}
