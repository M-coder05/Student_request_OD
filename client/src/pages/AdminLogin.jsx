import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoLogin from '../components/DemoLogin';
import DemoBanner from '../components/DemoBanner';
import ButtonLoader from '../components/ButtonLoader';
import PasswordInput from '../components/PasswordInput';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.className = 'auth-body';
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true });
    }
    return () => {
      document.body.className = '';
    };
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!result.user?.role || !['admin', 'super_admin', 'demo_admin'].includes(result.user.role)) {
        throw new Error('Access denied: You do not have administrator permissions.');
      }

      login(result.token, result.user);
      showToast('Admin logged in successfully');
      navigate('/admin');
    } catch (err) {
      showToast(err.message || 'Admin login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <div className="auth-shell">
        <div className="auth-panel auth-panel-form">
          <span className="auth-panel-kicker">AUTHORIZED ACCESS</span>
          <h2>Permanent Super Admin Login</h2>
          <p className="muted">Secure sign-in for the portal owner.</p>

          <form id="adminLoginForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="field-wrap">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                name="email"
                placeholder="Enter owner email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="field-wrap">
              <label htmlFor="admin-password">Password</label>
              <PasswordInput
                id="admin-password"
                name="password"
                placeholder="Enter password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <ButtonLoader
              type="submit"
              className="btn btn-primary full-width"
              loading={loading}
              loadingText="Signing in…"
            >
              Sign in as Super Admin
            </ButtonLoader>
          </form>

          <DemoLogin
            title="Admin Demo Login"
            kicker="RECRUITER / REVIEW ACCESS"
            roleFilter="admin"
          />

          <p className="auth-link">
            <Link to="/">&larr; Back to Home</Link>
          </p>
        </div>
      </div>
    </>
  );
}
