import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StudentHeader from '../components/StudentHeader';
import DemoBanner from '../components/DemoBanner';
import PasswordInput from '../components/PasswordInput';

export default function Profile() {
  const { user, updateUser, updateToken } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState({
    name: '',
    registerNumber: '',
    email: '',
    phone: '',
    department: '',
    year: '',
    semester: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const data = await apiRequest('/student/profile');
        if (!isMounted) return;

        const u = data.user || data;
        setProfileData({
          name: u.name || '',
          registerNumber: u.registerNumber || '',
          email: u.email || '',
          phone: u.phone || '',
          department: u.department || '',
          year: u.year || '',
          semester: String(u.semester || ''),
        });
      } catch (err) {
        if (!isMounted) return;
        setProfileError(err.message || 'Failed to load profile');
        showToast(err.message || 'Failed to load profile', 'error');
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        department: profileData.department,
        year: profileData.year,
        semester: profileData.semester,
      };

      const result = await apiRequest('/student/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // Preserve demo flag in stored user
      const updatedUser = {
        ...(result.user || payload),
        demo: user?.demo ?? false,
      };
      updateUser(updatedUser);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setSavingPassword(true);

    try {
      const result = await apiRequest('/student/change-password', {
        method: 'PUT',
        body: JSON.stringify(passwordData),
      });

      updateToken(result.token);
      showToast('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="My Profile" showNav={false} />

      <main className="page-shell">
        <div className="container profile-layout">
          <section className="card profile-card">
            <h2>Profile Details</h2>
            <p className="muted">Update your contact information.</p>

            {profileError && (
              <div
                style={{
                  padding: '12px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '6px',
                  marginBottom: '16px',
                }}
              >
                {profileError}
              </div>
            )}

            {loadingProfile ? (
              <p>Loading profile details…</p>
            ) : (
              <form id="profileForm" onSubmit={handleProfileSubmit}>
                <div className="field-wrap">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    required
                    disabled={savingProfile}
                  />
                </div>
                <div className="field-wrap">
                  <label>Register Number</label>
                  <input
                    type="text"
                    name="registerNumber"
                    value={profileData.registerNumber}
                    readOnly
                  />
                </div>
                <div className="field-wrap">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    required
                    disabled={savingProfile}
                  />
                </div>
                <div className="field-wrap">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    required
                    disabled={savingProfile}
                  />
                </div>
                <div className="two-col">
                  <div className="field-wrap">
                    <label>Department</label>
                    <select
                      name="department"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          department: e.target.value,
                        })
                      }
                      required
                      disabled={savingProfile}
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>
                  <div className="field-wrap">
                    <label>Year</label>
                    <select
                      name="year"
                      value={profileData.year}
                      onChange={(e) =>
                        setProfileData({ ...profileData, year: e.target.value })
                      }
                      required
                      disabled={savingProfile}
                    >
                      <option value="">Select Year</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>
                </div>
                <div className="field-wrap">
                  <label>Semester</label>
                  <select
                    name="semester"
                    value={profileData.semester}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        semester: e.target.value,
                      })
                    }
                    required
                    disabled={savingProfile}
                  >
                    <option value="">Select Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </form>
            )}
          </section>

          <section className="card profile-card">
            <h2>Change Password</h2>
            <p className="muted">Use a strong, unique password.</p>

            <form id="passwordForm" onSubmit={handlePasswordSubmit}>
              <div className="field-wrap">
                <label htmlFor="profile-current-password">Current Password</label>
                <PasswordInput
                  id="profile-current-password"
                  name="currentPassword"
                  autoComplete="current-password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  required
                  disabled={savingPassword}
                />
              </div>
              <div className="field-wrap">
                <label htmlFor="profile-new-password">New Password</label>
                <PasswordInput
                  id="profile-new-password"
                  name="newPassword"
                  autoComplete="new-password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  disabled={savingPassword}
                />
              </div>
              <div className="field-wrap">
                <label htmlFor="profile-confirm-password">Confirm New Password</label>
                <PasswordInput
                  id="profile-confirm-password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  disabled={savingPassword}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
