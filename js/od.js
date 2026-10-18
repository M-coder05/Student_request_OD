document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAuthenticated()) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const form = document.getElementById('odForm');

  form.studentName.value = user.name || '';
  form.registerNumber.value = user.registerNumber || '';
  form.department.value = user.department || '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      eventName: form.eventName.value,
      eventDate: form.eventDate.value,
      eventLocation: form.eventLocation.value,
      organizer: form.organizer.value,
      reason: form.reason.value,
    };

    try {
      await apiRequest('/od', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('OD request submitted', 'success');
      setTimeout(() => window.location.href = 'status.html', 800);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
});
