document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAdmin()) return;

  const renderStudents = (students) => {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach((student) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${student.name}</td>
        <td>${student.registerNumber}</td>
        <td>${student.email}</td>
        <td>${student.department}</td>
        <td>${student.year}</td>
        <td>${student.semester}</td>
      `;
      tbody.appendChild(tr);
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

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${request.requestId || request._id}</td>
        <td>${request.studentName || request.name}</td>
        <td>${request.type || 'Request'}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>${new Date(request.createdAt).toLocaleDateString()}</td>
        <td>
          <select data-id="${request._id}" class="admin-status-select">
            <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Approved" ${status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.admin-status-select').forEach((select) => {
      select.addEventListener('change', async (event) => {
        const id = event.target.dataset.id;
        const status = event.target.value;
        try {
          await apiRequest(`/admin/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status,
              adminRemark: 'Updated by admin',
            }),
          });
          showToast('Request status updated', 'success');
          loadAdminData();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  };

  const loadAdminData = async () => {
    try {
      const [dashboard, students, requests] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest('/admin/students'),
        apiRequest('/admin/requests'),
      ]);

      document.getElementById('totalStudents').textContent = dashboard.totalStudents || 0;
      document.getElementById('totalRequests').textContent = dashboard.totalRequests || 0;
      document.getElementById('pendingRequests').textContent = dashboard.pendingRequests || 0;
      document.getElementById('approvedRequests').textContent = dashboard.approvedRequests || 0;
      document.getElementById('rejectedRequests').textContent = dashboard.rejectedRequests || 0;
      document.getElementById('resolvedComplaints').textContent = dashboard.resolvedComplaints || 0;

      renderStudents(students.students || []);
      renderRequests((requests.requests || []).map((request) => ({ ...request, type: request.type || request.constructor?.name || 'Request' })));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  loadAdminData();
});
