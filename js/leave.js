document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAuthenticated()) return;

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const form = document.getElementById('leaveForm');

    form.studentName.value = user.name || '';
    form.registerNumber.value = user.registerNumber || '';
    form.department.value = user.department || '';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const payload = {
        fromDate: form.fromDate.value,
        toDate: form.toDate.value,
        reason: form.reason.value,
      };

      try {
        await apiRequest('/leave', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        showToast('Leave request submitted', 'success');
        setTimeout(() => window.location.href = 'status.html', 800);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
});
