import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DemoLogin({
  title = 'Try a demo account',
  kicker = 'GUIDED ACCESS',
  roleFilter = 'all', // 'all', 'admin', 'student'
}) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [config, setConfig] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Checking demo access…');
  const [isError, setIsError] = useState(false);
  const [busyRole, setBusyRole] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        const data = await apiRequest('/auth/demo/config');
        if (!isMounted) return;

        if (!data.enabled) {
          setConfig({ enabled: false });
          setIsError(true);
          setStatusMessage(
            data.reason === 'missing_credentials'
              ? 'Demo passwords are missing. Add both demo passwords to .env and restart the server.'
              : 'Demo access is disabled. Set DEMO_MODE=true in .env and restart the server.'
          );
          setLoadingConfig(false);
          return;
        }

        setConfig(data);
        const rolesToCheck = roleFilter === 'admin'
          ? ['admin']
          : roleFilter === 'student'
          ? ['student']
          : ['student', 'admin'];

        const allAvailable = rolesToCheck.every(
          (r) => data.roles && data.roles[r] && data.roles[r].available
        );

        if (allAvailable) {
          setStatusMessage('Demo access is ready. Changes affect sample data only.');
          setIsError(false);
        } else {
          setStatusMessage('Seed demo accounts with npm run seed:demo to enable access.');
          setIsError(true);
        }
      } catch (err) {
        if (!isMounted) return;
        setIsError(true);
        setStatusMessage(
          'Unable to check demo access. Confirm the backend is running, then reload this page.'
        );
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [roleFilter]);

  const handleDemoLogin = async (role) => {
    setBusyRole(role);
    setStatusMessage('Verifying demo account…');
    setIsError(false);

    try {
      const result = await apiRequest('/auth/demo/login', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });

      login(result.token, { ...result.user, demo: true });
      setStatusMessage('Demo account verified. Opening the portal…');

      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setIsError(true);
      setStatusMessage(err.message || 'Demo login failed');
      setBusyRole(null);
    }
  };

  const studentAvailable = Boolean(config?.enabled && config?.roles?.student?.available);
  const adminAvailable = Boolean(config?.enabled && config?.roles?.admin?.available);

  return (
    <section className="demo-access-card" aria-labelledby="demo-access-title">
      <div className="demo-access-heading">
        <div>
          <span className="auth-panel-kicker">{kicker}</span>
          <h3 id="demo-access-title">{title}</h3>
        </div>
        <span className="demo-label">DEMO</span>
      </div>

      <p
        className={`demo-access-status ${isError ? 'demo-status-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>

      <div className="demo-account-list">
        {(roleFilter === 'all' || roleFilter === 'student') && (
          <article className="demo-account">
            <div>
              <strong>Student demo</strong>
              <span>
                Email{' '}
                <code>
                  {loadingConfig
                    ? 'Checking…'
                    : config?.roles?.student?.email || 'Unavailable'}
                </code>
              </span>
              <span>Sample account — no real student records</span>
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loadingConfig || !studentAvailable || Boolean(busyRole)}
              onClick={() => handleDemoLogin('student')}
            >
              {busyRole === 'student' ? 'Signing in…' : 'Login as Student Demo'}
            </button>
          </article>
        )}

        {(roleFilter === 'all' || roleFilter === 'admin') && (
          <article className="demo-account">
            <div>
              <strong>Admin demo</strong>
              <span>
                Email{' '}
                <code>
                  {loadingConfig
                    ? 'Checking…'
                    : config?.roles?.admin?.email || 'Unavailable'}
                </code>
              </span>
              <span>Sample account — changes may reset</span>
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loadingConfig || !adminAvailable || Boolean(busyRole)}
              onClick={() => handleDemoLogin('admin')}
            >
              {busyRole === 'admin' ? 'Signing in…' : 'Login as Admin Demo'}
            </button>
          </article>
        )}
      </div>
    </section>
  );
}
