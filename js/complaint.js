document.addEventListener('DOMContentLoaded', () => {
  if (redirectIfNotAuthenticated()) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const form = document.getElementById('complaintForm');

  form.studentName.value = user.name || '';
  form.registerNumber.value = user.registerNumber || '';
  form.department.value = user.department || '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      category: form.category.value,
      subject: form.subject.value,
      description: form.description.value,
    };

    try {
      await apiRequest('/complaints', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Complaint submitted', 'success');
      setTimeout(() => window.location.href = 'status.html', 800);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
});
