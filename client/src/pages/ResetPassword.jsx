import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PasswordInput from '../components/PasswordInput';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset your password. Request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel-form" aria-labelledby="reset-password-title">
        <span className="auth-panel-kicker">ACCOUNT RECOVERY</span>
        <h1 id="reset-password-title">Choose a new password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field-wrap">
            <label htmlFor="reset-new-password">New password</label>
            <PasswordInput
              id="reset-new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError('');
              }}
              minLength={8}
              required
              disabled={submitting}
            />
          </div>
          <div className="field-wrap">
            <label htmlFor="reset-confirm-password">Confirm new password</label>
            <PasswordInput
              id="reset-confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError('');
              }}
              minLength={8}
              required
              disabled={submitting}
            />
          </div>
          {error ? <p className="password-reset-error" role="alert">{error}</p> : null}
          <button type="submit" className="btn btn-primary full-width" disabled={submitting}>
            {submitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>
        <p className="auth-link"><Link to="/login">Back to login</Link></p>
      </section>
    </main>
  );
}
