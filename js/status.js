document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAuthenticated()) return;

  const requestTypeFilter = document.getElementById('requestTypeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const tbody = document.getElementById('statusTableBody');

  const renderRows = (items) => {
    tbody.innerHTML = '';

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5">No requests found.</td></tr>';
      return;
    }

    items.forEach((item) => {
      const tr = document.createElement('tr');
      const type = item.type || item.requestType || 'Request';
      const status = item.status || 'Pending';

      const statusClass = {
        Pending: 'status-pending',
        Approved: 'status-approved',
        Rejected: 'status-rejected',
        'In Progress': 'status-progress',
        Resolved: 'status-resolved',
      }[status] || 'status-pending';

      tr.innerHTML = `
        <td>${item.requestId || item._id}</td>
        <td>${type}</td>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>${item.adminRemark || 'No remarks yet'}</td>
      `;
      tbody.appendChild(tr);
    });
  };

  const fetchRequests = async () => {
    try {
      const data = await apiRequest('/requests/my');
      renderRows(data.requests || []);
      let allRequests = data.requests || [];

      requestTypeFilter.addEventListener('change', applyFilters);
      statusFilter.addEventListener('change', applyFilters);

      function applyFilters() {
        const requestTypeValue = requestTypeFilter.value;
        const statusValue = statusFilter.value;

        const filtered = allRequests.filter((item) => {
          const typeMatch = requestTypeValue === 'All' || (item.type || item.requestType) === requestTypeValue;
          const statusMatch = statusValue === 'All' || item.status === statusValue;
          return typeMatch && statusMatch;
        });

        renderRows(filtered);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  fetchRequests();
});
