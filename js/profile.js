document.addEventListener('DOMContentLoaded', async () => {
  if (redirectIfNotAuthenticated()) return;

  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');

  try {
    const userData = await apiRequest('/student/profile');
    const user = userData.user;

    profileForm.name.value = user.name || '';
    profileForm.email.value = user.email || '';
    profileForm.phone.value = user.phone || '';
    profileForm.department.value = user.department || '';
    profileForm.year.value = user.year || '';
    profileForm.semester.value = user.semester || '';
  } catch (error) {
    showToast(error.message, 'error');
  }

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const payload = {
        name: profileForm.name.value,
        email: profileForm.email.value,
        phone: profileForm.phone.value,
        department: profileForm.department.value,
        year: profileForm.year.value,
        semester: profileForm.semester.value,
      };

      const updated = await apiRequest('/student/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      localStorage.setItem('user', JSON.stringify(updated.user));
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      currentPassword: passwordForm.currentPassword.value,
      newPassword: passwordForm.newPassword.value,
      confirmPassword: passwordForm.confirmPassword.value,
    };

    try {
      await apiRequest('/student/change-password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      passwordForm.reset();
      showToast('Password changed successfully', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
});
