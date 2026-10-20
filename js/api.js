const API_BASE_URL = window.API_BASE_URL
  ? window.API_BASE_URL.replace(/\/$/, '')
  : window.location.protocol === 'file:'
    || (['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '5000')
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

function getAuthToken() {
  return localStorage.getItem('token');
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  toast.style.background = type === 'error' ? '#dc2626' : '#111827';

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function redirectIfNotAuthenticated() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return true;
  }
  return false;
}

function redirectIfNotAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!localStorage.getItem('token') || !['admin', 'super_admin', 'demo_admin'].includes(user.role)) {
    window.location.href = 'admin-login.html';
    return true;
  }
  return false;
}
