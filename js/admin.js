document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAdmin()) return;

  let requestPage = 1;
  let studentPage = 1;
  let userPage = 1;
  let studentSearchTimer;
  let userSearchTimer;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

  const renderStudents = (students) => {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach((student) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.registerNumber)}</td>
        <td>${escapeHtml(student.email)}</td>
        <td>${escapeHtml(student.department)}</td>
        <td>${escapeHtml(student.year)}</td>
        <td>${escapeHtml(student.semester)}</td>
      `;
      tbody.appendChild(tr);
    });
  };

  const renderUsers = (users) => {
    const tbody = document.getElementById('adminUsersTableBody');
    tbody.replaceChildren();
    users.forEach((user) => {
      const canChange = !['super_admin', 'demo_admin'].includes(user.role);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role.replaceAll('_', ' '))}${user.isDemo ? ' · demo' : ''}</td>
        <td>${user.isActive === false ? 'Disabled' : 'Active'}</td>
        <td>${canChange ? `<button class="btn btn-secondary admin-account-toggle" type="button" data-id="${escapeHtml(user._id)}" data-active="${user.isActive !== false}">${user.isActive === false ? 'Enable' : 'Disable'}</button>` : 'Protected'}</td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.admin-account-toggle').forEach((button) => {
      button.addEventListener('click', async () => {
        const isActive = button.dataset.active !== 'true';
        const action = isActive ? 'enable' : 'disable';
        if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
        try {
          await apiRequest(`/admin/users/${button.dataset.id}/access`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
          });
          showToast(`Account ${action}d`, 'success');
          await loadAdminData();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  };

  const renderRequests = (requests) => {
    const tbody = document.getElementById('adminRequestsTableBody');
    tbody.innerHTML = '';

    requests.forEach((request) => {
      const status = request.status || 'Pending';
      const statusClass = {
        Pending: 'status-pending',
        Approved: 'status-approved',
        Rejected: 'status-rejected',
        'In Progress': 'status-progress',
        Resolved: 'status-resolved',
      }[status] || 'status-pending';
      const options = request.type === 'Complaint'
        ? ['Pending', 'In Progress', 'Resolved', 'Rejected']
        : ['Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved'];

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(request.requestId || request._id)}</td>
        <td>${escapeHtml(request.studentName || request.name)}</td>
        <td>${escapeHtml(request.type || 'Request')}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(new Date(request.createdAt).toLocaleDateString())}</td>
        <td>
          <select data-id="${escapeHtml(request._id)}" data-previous="${escapeHtml(status)}" class="admin-status-select" aria-label="Update status for ${escapeHtml(request.requestId || request._id)}">
            ${options.map((option) => `<option value="${option}" ${status === option ? 'selected' : ''}>${option}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-secondary admin-detail-button" type="button" data-id="${escapeHtml(request._id)}">View</button></td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.admin-status-select').forEach((select) => {
      select.addEventListener('change', async (event) => {
        const id = event.target.dataset.id;
        const previousStatus = event.target.dataset.previous;
        const status = event.target.value;
        if (!window.confirm(`Change this request from ${previousStatus} to ${status}?`)) {
          event.target.value = previousStatus;
          return;
        }
        try {
          await apiRequest(`/admin/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status,
              adminRemark: 'Updated by admin',
            }),
          });
          showToast('Request status updated', 'success');
          event.target.dataset.previous = status;
          await loadAdminData();
        } catch (error) {
          showToast(error.message, 'error');
          event.target.value = previousStatus;
        }
      });
    });

    document.querySelectorAll('.admin-detail-button').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const { request } = await apiRequest(`/admin/requests/${button.dataset.id}`);
          const history = (request.statusHistory || []).map((change) =>
            `${new Date(change.changedAt).toLocaleString()} | ${change.adminName}: ${change.fromStatus || 'New'} -> ${change.toStatus}${change.remark ? ` | ${change.remark}` : ''}`
          );
          window.alert([
            `${request.type} request ${request.requestId || request._id}`,
            `Student: ${request.studentName} (${request.registerNumber})`,
            `Submitted: ${new Date(request.createdAt).toLocaleString()}`,
            `Status: ${request.status}`,
            `Admin remark: ${request.adminRemark || 'None'}`,
            `Details: ${Object.entries(request).filter(([key]) => !['_id', '__v', 'studentId', 'statusHistory', 'type', 'createdAt', 'updatedAt', 'studentName', 'registerNumber', 'department', 'requestId', 'status', 'adminRemark'].includes(key)).map(([key, value]) => `${key}: ${value}`).join('\n') || 'None'}`,
            `Status history:\n${history.join('\n') || 'No changes recorded'}`,
          ].join('\n\n'));
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  };

  const renderActivity = (activities) => {
    const list = document.getElementById('adminActivityList');
    list.replaceChildren();
    if (!activities.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No administrative activity recorded yet.';
      list.appendChild(empty);
      return;
    }
    activities.forEach((activity) => {
      const item = document.createElement('li');
      item.textContent = `${new Date(activity.createdAt).toLocaleString()} · ${activity.administratorName} · ${activity.action.replaceAll('_', ' ')} · ${activity.recordType} ${activity.recordId} · ${activity.details}`;
      list.appendChild(item);
    });
  };

  const buildRequestQuery = () => {
    const query = new URLSearchParams({ page: String(requestPage) });
    ['requestSearch', 'requestStatusFilter', 'requestTypeFilter', 'requestFrom', 'requestTo'].forEach((id) => {
      const value = document.getElementById(id).value.trim();
      if (value) {
        const key = { requestSearch: 'q', requestStatusFilter: 'status', requestTypeFilter: 'type', requestFrom: 'from', requestTo: 'to' }[id];
        query.set(key, value);
      }
    });
    const [sortBy, sortOrder] = document.getElementById('requestSort').value.split(':');
    query.set('sortBy', sortBy);
    query.set('sortOrder', sortOrder);
    return query;
  };

  const loadAdminData = async () => {
    try {
      const [studentSortBy, studentSortOrder] = document.getElementById('studentSort').value.split(':');
      const [userSortBy, userSortOrder] = document.getElementById('userSort').value.split(':');
      const studentQuery = new URLSearchParams({ page: String(studentPage), q: document.getElementById('studentSearch').value.trim(), sortBy: studentSortBy, sortOrder: studentSortOrder });
      const userQuery = new URLSearchParams({ page: String(userPage), q: document.getElementById('userSearch').value.trim(), sortBy: userSortBy, sortOrder: userSortOrder });
      const [dashboard, students, users, requests, activity] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest(`/admin/students?${studentQuery}`),
        apiRequest(`/admin/users?${userQuery}`),
        apiRequest(`/admin/requests?${buildRequestQuery()}`),
        apiRequest('/admin/activity'),
      ]);

      document.getElementById('totalStudents').textContent = dashboard.totalStudents || 0;
      document.getElementById('totalUsers').textContent = dashboard.totalUsers || 0;
      document.getElementById('totalRequests').textContent = dashboard.totalRequests || 0;
      document.getElementById('pendingRequests').textContent = dashboard.pendingRequests || 0;
      document.getElementById('approvedRequests').textContent = dashboard.approvedRequests || 0;
      document.getElementById('rejectedRequests').textContent = dashboard.rejectedRequests || 0;
      document.getElementById('resolvedComplaints').textContent = dashboard.resolvedComplaints || 0;

      renderStudents(students.students || []);
      renderUsers(users.users || []);
      renderRequests(requests.requests || []);
      renderActivity(activity.activities || []);
      document.getElementById('studentsPageInfo').textContent = `Page ${students.page || 1} of ${Math.max(students.pages || 1, 1)} (${students.total || 0} students)`;
      document.getElementById('usersPageInfo').textContent = `Page ${users.page || 1} of ${Math.max(users.pages || 1, 1)} (${users.total || 0} users)`;
      document.getElementById('requestsPageInfo').textContent = `Page ${requests.page || 1} of ${Math.max(requests.pages || 1, 1)} (${requests.total || 0} requests)`;
      document.getElementById('studentsPrev').disabled = studentPage <= 1;
      document.getElementById('studentsNext').disabled = studentPage >= (students.pages || 1);
      document.getElementById('usersPrev').disabled = userPage <= 1;
      document.getElementById('usersNext').disabled = userPage >= (users.pages || 1);
      document.getElementById('requestsPrev').disabled = requestPage <= 1;
      document.getElementById('requestsNext').disabled = requestPage >= (requests.pages || 1);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  document.getElementById('applyRequestFilters').addEventListener('click', () => {
    requestPage = 1;
    loadAdminData();
  });
  document.getElementById('studentSearch').addEventListener('input', () => {
    clearTimeout(studentSearchTimer);
    studentSearchTimer = setTimeout(() => {
      studentPage = 1;
      loadAdminData();
    }, 250);
  });
  document.getElementById('userSearch').addEventListener('input', () => {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => {
      userPage = 1;
      loadAdminData();
    }, 250);
  });
  document.getElementById('studentSort').addEventListener('change', () => { studentPage = 1; loadAdminData(); });
  document.getElementById('userSort').addEventListener('change', () => { userPage = 1; loadAdminData(); });
  document.getElementById('studentsPrev').addEventListener('click', () => { studentPage -= 1; loadAdminData(); });
  document.getElementById('studentsNext').addEventListener('click', () => { studentPage += 1; loadAdminData(); });
  document.getElementById('usersPrev').addEventListener('click', () => { userPage -= 1; loadAdminData(); });
  document.getElementById('usersNext').addEventListener('click', () => { userPage += 1; loadAdminData(); });
  document.getElementById('requestsPrev').addEventListener('click', () => { requestPage -= 1; loadAdminData(); });
  document.getElementById('requestsNext').addEventListener('click', () => { requestPage += 1; loadAdminData(); });

  loadAdminData();
});
