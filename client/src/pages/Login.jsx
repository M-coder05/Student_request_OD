import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoLogin from '../components/DemoLogin';
import DemoBanner from '../components/DemoBanner';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.className = 'auth-body student-auth login-auth';
    if (isAuthenticated) {
      const destination = isAdmin
        ? '/admin'
        : ['faculty', 'hod', 'principal'].includes(user?.role)
          ? '/appointments/requests'
          : '/dashboard';
      navigate(destination, { replace: true });
    }
    return () => {
      document.body.className = '';
    };
  }, [isAuthenticated, isAdmin, user?.role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      password,
      ...(identifier.includes('@')
        ? { email: identifier.trim() }
        : { registerNumber: identifier.trim() }),
    };

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      login(result.token, result.user);
      showToast('Signed in successfully');
      const destination = result.user?.role && ['admin', 'super_admin', 'demo_admin'].includes(result.user.role)
        ? '/admin'
        : ['faculty', 'hod', 'principal'].includes(result.user?.role)
          ? '/appointments/requests'
          : '/dashboard';
      navigate(destination);
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <main className="student-auth-shell">
        <aside className="auth-aside">
          <Link className="site-brand auth-brand" to="/" aria-label="Smart Student Service Portal home">
            <span className="site-brand-mark" aria-hidden="true">SS</span>
            <span className="site-brand-name">
              Smart Student <span>Service Portal</span>
            </span>
          </Link>
          <div className="auth-aside-content">
            <span className="auth-aside-kicker">YOUR CAMPUS SERVICES, CONNECTED</span>
            <h1>
              Welcome back<br />
              to your portal.
            </h1>
            <p>
              Pick up where you left off. Your student services and submitted requests are ready when you are.
            </p>
            <div className="auth-aside-rule">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <Link to="/#services">
              Explore student services <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <span className="auth-aside-footer">A simpler way to stay on top of campus requests.</span>
        </aside>

        <section className="auth-panel auth-panel-form student-auth-panel" aria-labelledby="login-title">
          <div className="auth-panel-heading">
            <span className="auth-panel-kicker">STUDENT ACCOUNT</span>
            <h2 id="login-title">Sign in to continue</h2>
            <p className="muted">Students can use a register number; staff can sign in with their email.</p>
          </div>

          <form id="loginForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="field-wrap">
              <label htmlFor="login-register-number">Register Number, Employee ID or Email</label>
              <input
                id="login-register-number"
                type="text"
                name="registerNumber"
                placeholder="Enter register number, employee ID or email"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="field-wrap">
              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-controls="login-password"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary full-width auth-submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">&rarr;</span>
            </button>
          </form>

          <DemoLogin roleFilter="all" />

          <p className="auth-link">
            New to the portal? <Link to="/register">Create an account</Link>
          </p>
          <p className="auth-link">
            Portal owner or administrator? <Link to="/admin-login">Permanent Super Admin Login</Link>
          </p>
          <Link className="auth-home-link" to="/">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
        </section>
      </main>
    </>
  );
}
