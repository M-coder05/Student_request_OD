import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import DemoBanner from '../components/DemoBanner';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const emptyForm = {
  name: '',
  email: '',
  employeeId: '',
  phone: '',
  role: 'faculty',
  staffDepartment: '',
  designation: '',
  officeLocation: '',
  officeHours: '',
  meetingTopics: '',
};

const roles = ['faculty', 'hod', 'principal'];

export default function StaffManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [passwordAction, setPasswordAction] = useState('');

  const loadStaff = useCallback(async () => {
    if (user?.role !== 'super_admin' || user?.demo === true) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) query.set('q', search.trim());
      if (roleFilter) query.set('role', roleFilter);
      if (departmentFilter.trim()) query.set('department', departmentFilter.trim());
      if (statusFilter) query.set('status', statusFilter);
      const result = await apiRequest(`/admin/staff?${query}`);
      setStaff(result.staff || []);
      setPages(result.pages || 1);
      setTotal(result.total || 0);
    } catch (error) {
      showToast(error.message || 'Unable to load staff accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, departmentFilter, statusFilter, showToast, user?.role, user?.demo]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  if (user?.role !== 'super_admin' || user?.demo === true) {
    return <Navigate to="/admin" replace />;
  }

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setEditingId('');
    setForm(emptyForm);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiRequest(`/admin/staff/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            employeeId: form.employeeId,
            role: form.role,
            staffDepartment: form.staffDepartment,
            designation: form.designation,
            officeLocation: form.officeLocation,
            officeHours: form.officeHours,
            meetingTopics: form.meetingTopics,
          }),
        });
        showToast('Staff account updated');
        resetForm();
        await loadStaff();
      } else {
        const result = await apiRequest('/admin/staff', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setTemporaryPassword(result.temporaryPassword);
        setPasswordAction('Account created. Share this temporary password securely; it will not be shown again.');
        showToast('Staff account created');
        resetForm();
        await loadStaff();
      }
    } catch (error) {
      showToast(error.message || 'Unable to save staff account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editStaff = (member) => {
    setEditingId(member._id);
    setForm({
      name: member.name || '',
      email: member.email || '',
      employeeId: member.employeeId || member.registerNumber || '',
      phone: member.phone || '',
      role: member.role,
      staffDepartment: member.staffDepartment || member.department || '',
      designation: member.designation || '',
      officeLocation: member.officeLocation || '',
      officeHours: member.officeHours || '',
      meetingTopics: member.meetingTopics || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStaffStatus = async (member) => {
    const enable = member.isActive === false;
    const verb = enable ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${verb} ${member.name}'s account?`)) return;
    try {
      await apiRequest(`/admin/staff/${member._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: enable }),
      });
      showToast(`Staff account ${enable ? 'enabled' : 'disabled'}`);
      await loadStaff();
    } catch (error) {
      showToast(error.message || `Unable to ${verb} staff account`, 'error');
    }
  };

  const resetStaffPassword = async (member) => {
    if (!window.confirm(`Reset the password for ${member.name}? The current password will stop working.`)) return;
    try {
      const result = await apiRequest(`/admin/staff/${member._id}/reset-password`, { method: 'POST' });
      setTemporaryPassword(result.temporaryPassword);
      setPasswordAction(`Password reset for ${member.name}. Share this temporary password securely; it will not be shown again.`);
      showToast('Temporary password generated');
    } catch (error) {
      showToast(error.message || 'Unable to reset staff password', 'error');
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      showToast('Temporary password copied');
    } catch (error) {
      showToast('Unable to copy the password. Select and copy it manually.', 'error');
    }
  };

  const closePasswordModal = () => {
    setTemporaryPassword('');
    setPasswordAction('');
  };

  return (
    <>
      <DemoBanner />
      <header className="topbar inner-header">
        <div className="container nav-wrap">
          <div className="brand">
            <span className="brand-mark">SS</span>
            <span>Staff management</span>
          </div>
          <nav className="main-nav">
            <Link to="/admin">Admin dashboard</Link>
            <Link to="/appointments/requests">Appointment requests</Link>
          </nav>
          <NotificationBell />
        </div>
      </header>

      <main className="page-shell">
        <div className="container">
          <section className="card admin-section">
            <h2>{editingId ? 'Edit staff account' : 'Add staff account'}</h2>
            <form className="auth-form" onSubmit={submitForm}>
              <div className="admin-filters">
                <label className="field-wrap">
                  Name
                  <input value={form.name} onChange={(event) => setField('name', event.target.value)} minLength="2" maxLength="100" required />
                </label>
                {!editingId ? (
                  <label className="field-wrap">
                    Email
                    <input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required />
                  </label>
                ) : null}
                <label className="field-wrap">
                  Employee ID
                  <input value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)} maxLength="50" required />
                </label>
                <label className="field-wrap">
                  Phone
                  <input type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} maxLength="30" required />
                </label>
                <label className="field-wrap">
                  Role
                  <select value={form.role} onChange={(event) => setField('role', event.target.value)}>
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <label className="field-wrap">
                  Department {form.role === 'principal' ? '(optional)' : ''}
                  <input value={form.staffDepartment} onChange={(event) => setField('staffDepartment', event.target.value)} maxLength="100" required={form.role !== 'principal'} />
                </label>
                <label className="field-wrap">
                  Designation
                  <span className="staff-detail-field">
                    <input value={form.designation} onChange={(event) => setField('designation', event.target.value)} maxLength="80" />
                    <small className="muted">Up to 80 characters</small>
                  </span>
                </label>
                <label className="field-wrap">
                  Office
                  <span className="staff-detail-field">
                    <input value={form.officeLocation} onChange={(event) => setField('officeLocation', event.target.value)} maxLength="80" />
                    <small className="muted">Up to 80 characters</small>
                  </span>
                </label>
                <label className="field-wrap">
                  Office hours
                  <span className="staff-detail-field">
                    <input value={form.officeHours} onChange={(event) => setField('officeHours', event.target.value)} maxLength="120" />
                    <small className="muted">Up to 120 characters</small>
                  </span>
                </label>
                <label className="field-wrap">
                  Meeting topics
                  <span className="staff-detail-field">
                    <input value={form.meetingTopics} onChange={(event) => setField('meetingTopics', event.target.value)} maxLength="160" />
                    <small className="muted">Up to 160 characters</small>
                  </span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create staff account'}
                </button>
                {editingId ? <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancel edit</button> : null}
              </div>
            </form>
          </section>

          <section className="card admin-section">
            <div className="admin-table-heading">
              <h2>Staff accounts</h2>
              <input type="search" aria-label="Search staff" placeholder="Name, email or employee ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              <select aria-label="Filter staff role" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
                <option value="">All roles</option>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <input type="search" aria-label="Filter by department" placeholder="Department" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }} />
              <select aria-label="Filter staff status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Office</th><th>Employee ID</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {staff.length ? staff.map((member) => (
                    <tr key={member._id}>
                      <td>{member.name}</td>
                      <td>{member.role}</td>
                      <td>{member.staffDepartment || member.department || 'Not set'}</td>
                      <td>{member.designation || 'Not set'}</td>
                      <td>{member.officeLocation || 'Not set'}</td>
                      <td>{member.employeeId || member.registerNumber}</td>
                      <td>{member.isActive ? 'Active' : 'Disabled'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <button className="btn btn-secondary" type="button" onClick={() => editStaff(member)}>Edit</button>
                          <button className="btn btn-secondary" type="button" onClick={() => toggleStaffStatus(member)}>{member.isActive ? 'Disable' : 'Enable'}</button>
                          <button className="btn btn-secondary" type="button" onClick={() => resetStaffPassword(member)}>Reset password</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>{loading ? 'Loading staff…' : 'No staff accounts found.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={pages}
              total={total}
              itemLabel="staff accounts"
              onPrev={() => setPage((current) => Math.max(current - 1, 1))}
              onNext={() => setPage((current) => Math.min(current + 1, pages))}
            />
          </section>
        </div>
      </main>

      <Modal isOpen={Boolean(temporaryPassword)} title="Temporary password" onClose={closePasswordModal}>
        <p><strong>Important:</strong> This password is shown only once. Copy and share it securely now. The staff member must set a new password at first sign-in.</p>
        <p>{passwordAction}</p>
        <code style={{ display: 'block', overflowWrap: 'anywhere', padding: 12, background: '#f1f5f9', borderRadius: 6 }}>{temporaryPassword}</code>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={copyPassword}>Copy password</button>
          <button type="button" className="btn btn-secondary" onClick={closePasswordModal}>Close</button>
        </div>
      </Modal>
    </>
  );
}
