import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordInput from '../components/PasswordInput';

export default function SetPassword() {
  const { user, updateToken, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    return <Navigate to={['faculty', 'hod', 'principal'].includes(user.role) ? '/appointments/requests' : '/dashboard'} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiRequest('/student/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      updateToken(result.token);
      updateUser({ ...user, mustChangePassword: false });
      showToast('Password updated successfully');
      navigate(['faculty', 'hod', 'principal'].includes(user.role) ? '/appointments/requests' : '/dashboard', { replace: true });
    } catch (error) {
      showToast(error.message || 'Unable to update password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-panel-form">
        <span className="auth-panel-kicker">ACCOUNT SECURITY</span>
        <h1>Set a new password</h1>
        <p className="muted">Your temporary password must be replaced before continuing.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="field-wrap">
            <label htmlFor="temporary-password">Temporary password</label>
            <PasswordInput id="temporary-password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={submitting} />
          </div>
          <div className="field-wrap">
            <label htmlFor="new-password">New password</label>
            <PasswordInput id="new-password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required disabled={submitting} />
          </div>
          <div className="field-wrap">
            <label htmlFor="confirm-password">Confirm new password</label>
            <PasswordInput id="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required disabled={submitting} />
          </div>
          <button type="submit" className="btn btn-primary full-width" disabled={submitting}>
            {submitting ? 'Updating…' : 'Set password'}
          </button>
        </form>
      </section>
    </main>
  );
}
