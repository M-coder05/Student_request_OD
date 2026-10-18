document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAuthenticated()) return;

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const result = await apiRequest('/student/dashboard');

    document.getElementById('studentName').textContent = user.name || 'Student';
    document.getElementById('studentReg').textContent = `Reg No: ${user.registerNumber || '---'}`;
    document.getElementById('studentDept').textContent = `Dept: ${user.department || '---'}`;
    document.getElementById('studentYear').textContent = `Year: ${user.year || '---'}`;

    document.getElementById('totalRequests').textContent = result.totalRequests || 0;
    document.getElementById('pendingRequests').textContent = result.pendingRequests || 0;
    document.getElementById('approvedRequests').textContent = result.approvedRequests || 0;
    document.getElementById('rejectedRequests').textContent = result.rejectedRequests || 0;
  } catch (error) {
    showToast(error.message, 'error');
  }
});
