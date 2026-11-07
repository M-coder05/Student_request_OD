import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const result = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setMessage(`${result.message}. If you don't hear back, contact your department office with your ID card.`);
    } catch (error) {
      showToast(error.message || 'Unable to record your request. Please try again later.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel-form" aria-labelledby="forgot-password-title">
        <span className="auth-panel-kicker">ACCOUNT RECOVERY</span>
        <h1 id="forgot-password-title">Forgot password?</h1>
        <p className="muted">Enter your register number or email address to record a recovery request.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="field-wrap">
            <label htmlFor="forgot-identifier">Register number or email</label>
            <input
              id="forgot-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <button type="submit" className="btn btn-primary full-width" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
        {message ? <p className="password-reset-message" role="status">{message}</p> : null}
        <p className="auth-link"><Link to="/login">Back to login</Link></p>
      </section>
    </main>
  );
}
