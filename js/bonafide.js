document.addEventListener('DOMContentLoaded', () => {
  if (redirectIfNotAuthenticated()) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const form = document.getElementById('bonafideForm');

  form.studentName.value = user.name || '';
  form.registerNumber.value = user.registerNumber || '';
  form.department.value = user.department || '';
  form.year.value = user.year || '';
  form.semester.value = user.semester || '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      year: form.year.value,
      semester: form.semester.value,
      purpose: form.purpose.value,
      additionalDetails: form.additionalDetails.value,
    };

    try {
      await apiRequest('/bonafide', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Bonafide request submitted', 'success');
      setTimeout(() => window.location.href = 'status.html', 800);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
});
