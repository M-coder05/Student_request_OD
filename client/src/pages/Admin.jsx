import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import DemoBanner from '../components/DemoBanner';
import { formatDate, formatDateTime } from '../utils/formatDate';
import { Link } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

export default function Admin() {
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalUsers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    approvedRequests: 0,
    resolvedRequests: 0,
    rejectedRequests: 0,
  });

  // Students Table State
  const [students, setStudents] = useState([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPages, setStudentPages] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState('createdAt:desc');

  // Users Table State
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState('createdAt:desc');

  // Requests Table State
  const [requests, setRequests] = useState([]);
  const [requestPage, setRequestPage] = useState(1);
  const [requestPages, setRequestPages] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [requestSort, setRequestSort] = useState('createdAt:desc');
  const [requestFrom, setRequestFrom] = useState('');
  const [requestTo, setRequestTo] = useState('');

  // Applied request filter state (triggered by Filter button)
  const [appliedRequestFilters, setAppliedRequestFilters] = useState({
    search: '',
    status: '',
    type: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    from: '',
    to: '',
  });

  // Activities State
  const [activities, setActivities] = useState([]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load Admin Data
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentSortBy, studentSortOrder] = studentSort.split(':');
      const [userSortBy, userSortOrder] = userSort.split(':');

      const studentQuery = new URLSearchParams({
        page: String(studentPage),
        q: studentSearch.trim(),
        sortBy: studentSortBy,
        sortOrder: studentSortOrder,
      });

      const userQuery = new URLSearchParams({
        page: String(userPage),
        q: userSearch.trim(),
        sortBy: userSortBy,
        sortOrder: userSortOrder,
      });

      const reqQuery = new URLSearchParams({
        page: String(requestPage),
        sortBy: appliedRequestFilters.sortBy,
        sortOrder: appliedRequestFilters.sortOrder,
      });
      if (appliedRequestFilters.search) reqQuery.set('q', appliedRequestFilters.search);
      if (appliedRequestFilters.status) reqQuery.set('status', appliedRequestFilters.status);
      if (appliedRequestFilters.type) reqQuery.set('type', appliedRequestFilters.type);
      if (appliedRequestFilters.from) reqQuery.set('from', appliedRequestFilters.from);
      if (appliedRequestFilters.to) reqQuery.set('to', appliedRequestFilters.to);

      const [dashRes, studentsRes, usersRes, requestsRes, actRes] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest(`/admin/students?${studentQuery}`),
        apiRequest(`/admin/users?${userQuery}`),
        apiRequest(`/admin/requests?${reqQuery}`),
        apiRequest('/admin/activity'),
      ]);

      setStats({
        totalStudents: dashRes.totalStudents || 0,
        totalUsers: dashRes.totalUsers || 0,
        totalRequests: dashRes.totalRequests || 0,
        pendingRequests: dashRes.pendingRequests || 0,
        inProgressRequests: dashRes.inProgressRequests || 0,
        approvedRequests: dashRes.approvedRequests || 0,
        resolvedRequests: dashRes.resolvedRequests || 0,
        rejectedRequests: dashRes.rejectedRequests || 0,
      });

      setStudents(studentsRes.students || []);
      setStudentPages(studentsRes.pages || 1);
      setStudentTotal(studentsRes.total || 0);

      setUsers(usersRes.users || []);
      setUserPages(usersRes.pages || 1);
      setUserTotal(usersRes.total || 0);

      setRequests(requestsRes.requests || []);
      setRequestPages(requestsRes.pages || 1);
      setRequestTotal(requestsRes.total || 0);

      setActivities(actRes.activities || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data');
      showToast(err.message || 'Failed to load administrator data', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    studentPage,
    studentSearch,
    studentSort,
    userPage,
    userSearch,
    userSort,
    requestPage,
    appliedRequestFilters,
    showToast,
  ]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handle Account Toggle
  const handleToggleUserAccess = async (userToToggle) => {
    const isCurrentlyActive = userToToggle.isActive !== false;
    const nextState = !isCurrentlyActive;
    const actionWord = nextState ? 'enable' : 'disable';

    if (!window.confirm(`Are you sure you want to ${actionWord} this account?`)) {
      return;
    }

    try {
      await apiRequest(`/admin/users/${userToToggle._id}/access`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      });
      showToast(`Account ${actionWord}d`);
      loadAdminData();
    } catch (err) {
      showToast(err.message || `Failed to ${actionWord} account`, 'error');
    }
  };

  // Handle Status Change on Request
  const handleStatusChange = async (request, e) => {
    const selectEl = e.target;
    const previousStatus = request.status || 'Pending';
    const newStatus = selectEl.value;

    if (!window.confirm(`Change this request from ${previousStatus} to ${newStatus}?`)) {
      selectEl.value = previousStatus;
      return;
    }

    const remark = window.prompt('Enter a remark (optional)', '');
    if (remark === null) {
      selectEl.value = previousStatus;
      return;
    }

    try {
      const payload = {
        status: newStatus,
        ...(remark.trim() ? { adminRemark: remark.trim() } : {}),
      };

      await apiRequest(`/admin/requests/${request._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      showToast('Request status updated');
      loadAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to update request status', 'error');
      selectEl.value = previousStatus;
    }
  };

  // Handle View Request Details
  const handleViewDetails = async (requestId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    setSelectedRequest(null);

    try {
      const res = await apiRequest(`/admin/requests/${requestId}`);
      setSelectedRequest(res.request || res);
    } catch (err) {
      showToast(err.message || 'Failed to fetch request details', 'error');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Apply Request Filter Click
  const handleApplyRequestFilters = () => {
    const [sortBy, sortOrder] = requestSort.split(':');
    setRequestPage(1);
    setAppliedRequestFilters({
      search: requestSearch.trim(),
      status: requestStatusFilter,
      type: requestTypeFilter,
      sortBy,
      sortOrder,
      from: requestFrom,
      to: requestTo,
    });
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
          <div className="brand">
            <span className="brand-mark">SS</span>
            <span>Admin Dashboard</span>
          </div>
          <nav className="main-nav">
            <Link to="/appointments/requests">Appointment requests</Link>
            <Link to="/appointments/today">Today's schedule</Link>
            {user?.role === 'super_admin' && user?.demo !== true ? <Link to="/admin/staff">Staff management</Link> : null}
          </nav>
          <NotificationBell />
          <button
            id="adminLogoutBtn"
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="page-shell">
        <div className="container">
          {error && (
            <div
              className="card"
              style={{
                padding: '16px',
                background: '#fee2e2',
                color: '#b91c1c',
                marginBottom: '20px',
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <section className="stats-grid admin-stats">
            <div className="stat-card">
              <span className="stat-label">Total Students</span>
              <strong id="totalStudents">{loading ? '…' : stats.totalStudents}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Registered Users</span>
              <strong id="totalUsers">{loading ? '…' : stats.totalUsers}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Requests</span>
              <strong id="totalRequests">{loading ? '…' : stats.totalRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending</span>
              <strong id="pendingRequests">{loading ? '…' : stats.pendingRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">In Progress</span>
              <strong id="inProgressRequests">{loading ? '…' : stats.inProgressRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Approved</span>
              <strong id="approvedRequests">{loading ? '…' : stats.approvedRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Resolved</span>
              <strong id="resolvedRequests">{loading ? '…' : stats.resolvedRequests}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Rejected</span>
              <strong id="rejectedRequests">{loading ? '…' : stats.rejectedRequests}</strong>
            </div>
          </section>

          {/* Students Section */}
          <section className="card admin-section">
            <div className="admin-table-heading">
              <h3>Students</h3>
              <label className="admin-search-label" htmlFor="studentSearch">
                Search students
              </label>
              <input
                id="studentSearch"
                type="search"
                placeholder="Name, register number, email"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentPage(1);
                }}
              />
              <select
                id="studentSort"
                aria-label="Sort students"
                value={studentSort}
                onChange={(e) => {
                  setStudentSort(e.target.value);
                  setStudentPage(1);
                }}
              >
                <option value="createdAt:desc">Newest first</option>
                <option value="name:asc">Name A–Z</option>
                <option value="name:desc">Name Z–A</option>
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register Number</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Semester</th>
                  </tr>
                </thead>
                <tbody id="studentsTableBody">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                        {loading ? 'Loading students…' : 'No students found.'}
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student._id}>
                        <td>{student.name}</td>
                        <td>{student.registerNumber}</td>
                        <td>{student.email}</td>
                        <td>{student.department}</td>
                        <td>{student.year}</td>
                        <td>{student.semester}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={studentPage}
              pages={studentPages}
              total={studentTotal}
              itemLabel="students"
              onPrev={() => setStudentPage((p) => Math.max(p - 1, 1))}
              onNext={() => setStudentPage((p) => Math.min(p + 1, studentPages))}
            />
          </section>

          {/* Account Management Section */}
          <section className="card admin-section">
            <div className="admin-table-heading">
              <h3>Account Management</h3>
              <input
                id="userSearch"
                type="search"
                aria-label="Search users"
                placeholder="Name, email, role"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
              <select
                id="userSort"
                aria-label="Sort users"
                value={userSort}
                onChange={(e) => {
                  setUserSort(e.target.value);
                  setUserPage(1);
                }}
              >
                <option value="createdAt:desc">Newest first</option>
                <option value="name:asc">Name A–Z</option>
                <option value="role:asc">Role A–Z</option>
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Account</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="adminUsersTableBody">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        {loading ? 'Loading accounts…' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const canChange = !['super_admin', 'demo_admin'].includes(u.role);
                      const isActive = u.isActive !== false;
                      return (
                        <tr key={u._id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            {u.role.replace(/_/g, ' ')}
                            {u.isDemo ? ' — demo' : ''}
                          </td>
                          <td>{isActive ? 'Active' : 'Disabled'}</td>
                          <td>
                            {canChange ? (
                              <button
                                className="btn btn-secondary admin-account-toggle"
                                type="button"
                                onClick={() => handleToggleUserAccess(u)}
                              >
                                {isActive ? 'Disable' : 'Enable'}
                              </button>
                            ) : (
                              'Protected'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={userPage}
              pages={userPages}
              total={userTotal}
              itemLabel="users"
              onPrev={() => setUserPage((p) => Math.max(p - 1, 1))}
              onNext={() => setUserPage((p) => Math.min(p + 1, userPages))}
            />
          </section>

          {/* Manage Requests Section */}
          <section className="card admin-section">
            <div className="admin-table-heading">
              <h3>Manage Requests</h3>
              <div className="admin-filters">
                <input
                  id="requestSearch"
                  type="search"
                  aria-label="Search requests"
                  placeholder="Search ID or student"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                />
                <select
                  id="requestStatusFilter"
                  aria-label="Filter by status"
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <select
                  id="requestTypeFilter"
                  aria-label="Filter by type"
                  value={requestTypeFilter}
                  onChange={(e) => setRequestTypeFilter(e.target.value)}
                >
                  <option value="">All types</option>
                  <option value="Leave">Leave</option>
                  <option value="OD">OD</option>
                  <option value="Bonafide">Bonafide</option>
                  <option value="Complaint">Complaint</option>
                </select>
                <select
                  id="requestSort"
                  aria-label="Sort requests"
                  value={requestSort}
                  onChange={(e) => setRequestSort(e.target.value)}
                >
                  <option value="createdAt:desc">Newest first</option>
                  <option value="createdAt:asc">Oldest first</option>
                  <option value="studentName:asc">Student A–Z</option>
                  <option value="status:asc">Status A–Z</option>
                  <option value="type:asc">Type A–Z</option>
                </select>
                <label>
                  From{' '}
                  <input
                    id="requestFrom"
                    type="date"
                    value={requestFrom}
                    onChange={(e) => setRequestFrom(e.target.value)}
                  />
                </label>
                <label>
                  To{' '}
                  <input
                    id="requestTo"
                    type="date"
                    value={requestTo}
                    onChange={(e) => setRequestTo(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="applyRequestFilters"
                  onClick={handleApplyRequestFilters}
                >
                  Filter
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody id="adminRequestsTableBody">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                        {loading ? 'Loading requests…' : 'No requests found.'}
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const status = req.status || 'Pending';
                      const options =
                        req.type === 'Complaint'
                          ? ['Pending', 'In Progress', 'Resolved', 'Rejected']
                          : ['Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved'];

                      return (
                        <tr key={req._id}>
                          <td>{req.requestId || req._id}</td>
                          <td>{req.studentName || req.name}</td>
                          <td>{req.type || 'Request'}</td>
                          <td>
                            <StatusBadge status={status} />
                          </td>
                          <td>
                            {formatDateTime(req.createdAt)}
                          </td>
                          <td>
                            <select
                              className="admin-status-select"
                              value={status}
                              onChange={(e) => handleStatusChange(req, e)}
                              aria-label={`Update status for ${req.requestId || req._id}`}
                            >
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary admin-detail-button"
                              type="button"
                              onClick={() => handleViewDetails(req._id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={requestPage}
              pages={requestPages}
              total={requestTotal}
              itemLabel="requests"
              onPrev={() => setRequestPage((p) => Math.max(p - 1, 1))}
              onNext={() => setRequestPage((p) => Math.min(p + 1, requestPages))}
            />
          </section>

          {/* Recent Administrative Activity */}
          <section className="card admin-section">
            <h3>Recent Administrative Activity</h3>
            <ul id="adminActivityList" className="admin-activity-list">
              {activities.length === 0 ? (
                <li>No administrative activity recorded yet.</li>
              ) : (
                activities.map((act) => (
                  <li key={act._id}>
                    {formatDateTime(act.createdAt)} •{' '}
                    <strong>{act.administratorName}</strong> •{' '}
                    <span>{act.action?.replace(/_/g, ' ')}</span> •{' '}
                    <span>
                      {act.recordType} {act.recordId}
                    </span>{' '}
                    • {act.details}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </main>

      {/* Request Detail Modal with Status History */}
      <Modal
        isOpen={detailModalOpen}
        title={
          selectedRequest
            ? `${selectedRequest.type || 'Request'} Details (${selectedRequest.requestId || selectedRequest._id})`
            : 'Request Details'
        }
        onClose={() => setDetailModalOpen(false)}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDetailModalOpen(false)}
          >
            Close
          </button>
        }
      >
        {loadingDetail ? (
          <p>Loading request details…</p>
        ) : selectedRequest ? (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div>
                <small className="muted">Student Name</small>
                <div>
                  <strong>{selectedRequest.studentName}</strong>
                </div>
              </div>
              <div>
                <small className="muted">Register Number</small>
                <div>
                  <strong>{selectedRequest.registerNumber}</strong>
                </div>
              </div>
              <div>
                <small className="muted">Department</small>
                <div>{selectedRequest.department || '--'}</div>
              </div>
              <div>
                <small className="muted">Submitted On</small>
                <div>
                  {formatDateTime(selectedRequest.createdAt)}
                </div>
              </div>
              <div>
                <small className="muted">Current Status</small>
                <div>
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <div>
                <small className="muted">Admin Remark</small>
                <div>{selectedRequest.adminRemark || 'None'}</div>
              </div>
            </div>

            {/* Custom Request Fields */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--navy-950)' }}>
                Application Information
              </h4>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                {Object.entries(selectedRequest)
                  .filter(
                    ([key]) =>
                      ![
                        '_id',
                        '__v',
                        'studentId',
                        'statusHistory',
                        'type',
                        'createdAt',
                        'updatedAt',
                        'studentName',
                        'registerNumber',
                        'department',
                        'requestId',
                        'status',
                        'adminRemark',
                      ].includes(key)
                  )
                  .map(([key, val]) => (
                    <div key={key}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {key.replace(/([A-Z])/g, ' $1')}:
                      </span>{' '}
                      <span>
                        {/date$/i.test(key)
                          ? formatDate(val)
                          : /(?:at|timestamp)$/i.test(key)
                            ? formatDateTime(val)
                            : String(val)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Status History Timeline */}
            <div>
              <h4 style={{ margin: '0 0 14px 0', color: 'var(--navy-950)' }}>
                Status History
              </h4>
              {(!selectedRequest.statusHistory ||
                selectedRequest.statusHistory.length === 0) ? (
                <p className="muted">No status changes recorded.</p>
              ) : (
                <div className="status-timeline">
                  {selectedRequest.statusHistory.map((step, idx) => (
                    <div
                      key={idx}
                      className={`timeline-step ${
                        idx === selectedRequest.statusHistory.length - 1
                          ? 'current'
                          : 'complete'
                      }`}
                    >
                      <div className="timeline-dot"></div>
                      <div>
                        <h3>
                          {step.fromStatus || 'Submitted'} &rarr;{' '}
                          <strong>{step.toStatus}</strong>
                        </h3>
                        <p>
                          <span>
                            {formatDateTime(step.changedAt)}
                          </span>
                          {' • '}
                          <span>Admin: {step.adminName}</span>
                          {step.remark && (
                            <>
                              {' • '}
                              <em>Remark: {step.remark}</em>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
