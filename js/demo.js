document.addEventListener('DOMContentLoaded', async () => {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  if (storedUser.demo === true) {
    const banner = document.createElement('aside');
    banner.className = 'demo-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<span><strong>Demo account</strong> · Changes are limited to demo data and may be reset.</span><button type="button" data-demo-exit>Exit demo</button>';
    document.body.prepend(banner);
    banner.querySelector('[data-demo-exit]').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }

  const demoPanel = document.querySelector('[data-demo-panel]');
  if (!demoPanel || typeof apiRequest !== 'function') {
    return;
  }

  const status = demoPanel.querySelector('[data-demo-status]');
  const buttons = [...demoPanel.querySelectorAll('[data-demo-role]')];

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('demo-status-error', isError);
  };

  buttons.forEach((button) => {
    button.disabled = true;
    button.addEventListener('click', async () => {
      const role = button.dataset.demoRole;
      buttons.forEach((item) => {
        item.disabled = true;
      });
      button.setAttribute('aria-busy', 'true');
      setStatus('Verifying demo account…');

      try {
        const result = await apiRequest('/auth/demo/login', {
          method: 'POST',
          body: JSON.stringify({ role }),
        });

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify({ ...result.user, demo: true }));
        setStatus('Demo account verified. Opening the portal…');
        window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
      } catch (error) {
        setStatus(error.message, true);
        buttons.forEach((item) => {
          item.disabled = item.dataset.available !== 'true';
          item.removeAttribute('aria-busy');
        });
      }
    });
  });

  try {
    const config = await apiRequest('/auth/demo/config');
    if (!config.enabled) {
      setStatus('Demo accounts are not configured for this environment.');
      return;
    }

    ['student', 'admin'].forEach((role) => {
      const account = config.roles[role];
      const button = demoPanel.querySelector(`[data-demo-role="${role}"]`);
      const email = demoPanel.querySelector(`[data-demo-email="${role}"]`);
      const password = demoPanel.querySelector(`[data-demo-password="${role}"]`);

      button.dataset.available = String(Boolean(account?.available));
      button.disabled = !account?.available;
      email.textContent = account?.email || 'Not seeded';
      password.textContent = account?.password || 'Not available';
    });

    const availableCount = buttons.filter((button) => button.dataset.available === 'true').length;
    setStatus(availableCount === 2
      ? 'Both demo roles are ready. Choose a role to sign in.'
      : 'Seed demo accounts with npm run seed:demo to enable access.', availableCount !== 2);
  } catch (error) {
    setStatus(error.message || 'Unable to check demo account availability.', true);
  }
});
