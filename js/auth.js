document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const adminLoginForm = document.getElementById('adminLoginForm');

  document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const passwordInput = document.getElementById(toggle.getAttribute('aria-controls'));
      const isVisible = passwordInput.type === 'text';

      passwordInput.type = isVisible ? 'password' : 'text';
      toggle.textContent = isVisible ? 'Show' : 'Hide';
      toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    });
  });

  if (registerForm) {
    const passwordInput = registerForm.elements.password;
    const confirmPasswordInput = registerForm.elements.confirmPassword;
    const validatePasswordMatch = () => {
      const mismatch = confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value;
      confirmPasswordInput.setCustomValidity(mismatch ? 'Passwords do not match.' : '');
    };

    passwordInput.addEventListener('input', validatePasswordMatch);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const result = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        showToast('Registration successful', 'success');

        setTimeout(() => window.location.href = 'dashboard.html', 1000);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const payload = Object.fromEntries(formData.entries());

      if (payload.registerNumber.includes('@')) {
        payload.email = payload.registerNumber;
        delete payload.registerNumber;
      }

      try {
        const result = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        showToast('Login successful', 'success');

        setTimeout(() => window.location.href = 'dashboard.html', 1000);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(adminLoginForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const result = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (!['admin', 'super_admin', 'demo_admin'].includes(result.user.role)) {
          throw new Error('Access denied. An administrator account is required.');
        }

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        showToast('Admin login successful', 'success');

        setTimeout(() => window.location.href = 'admin.html', 1000);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  const logoutButton = document.getElementById('logoutBtn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  }

  const adminLogoutButton = document.getElementById('adminLogoutBtn');
  if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'admin-login.html';
    });
  }
});
