import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    email: '',
    phone: '',
    department: '',
    year: '',
    semester: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.className = 'auth-body student-auth register-auth';
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
    return () => {
      document.body.className = '';
    };
  }, [isAuthenticated, isAdmin, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (formData.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      login(result.token, result.user);
      showToast('Registration successful! Redirecting…');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <main className="student-auth-shell register-shell">
        <aside className="auth-aside">
          <Link className="site-brand auth-brand" to="/" aria-label="Smart Student Service Portal home">
            <span className="site-brand-mark" aria-hidden="true">SS</span>
            <span className="site-brand-name">
              Smart Student <span>Service Portal</span>
            </span>
          </Link>
          <div className="auth-aside-content">
            <span className="auth-aside-kicker">A BETTER WAY TO GET THINGS DONE</span>
            <h1>
              Make campus<br />
              services simpler.
            </h1>
            <p>
              Create your student account to submit service requests and follow their status in one place.
            </p>
            <div className="auth-aside-rule">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <Link to="/#services">
              See available services <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <span className="auth-aside-footer">One student account. Connected campus services.</span>
        </aside>

        <section className="auth-panel auth-panel-form student-auth-panel register-panel" aria-labelledby="register-title">
          <div className="auth-panel-heading">
            <span className="auth-panel-kicker">STUDENT ACCOUNT</span>
            <h2 id="register-title">Create your account</h2>
            <p className="muted">Enter your details to get started.</p>
          </div>

          <form id="registerForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="two-col">
              <div className="field-wrap">
                <label htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="field-wrap">
                <label htmlFor="register-number">Register Number</label>
                <input
                  id="register-number"
                  type="text"
                  name="registerNumber"
                  placeholder="Enter your register number"
                  autoComplete="username"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="two-col">
              <div className="field-wrap">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="field-wrap">
                <label htmlFor="register-phone">Phone</label>
                <input
                  id="register-phone"
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="two-col">
              <div className="field-wrap">
                <label htmlFor="register-department">Department</label>
                <select
                  id="register-department"
                  name="department"
                  autoComplete="organization-title"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select department</option>
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
                <label htmlFor="register-year">Year</label>
                <select
                  id="register-year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select year</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>
            </div>

            <div className="two-col">
              <div className="field-wrap">
                <label htmlFor="register-semester">Semester</label>
                <select
                  id="register-semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select semester</option>
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
              <div className="field-wrap">
                <label htmlFor="register-password">Password</label>
                <div className="password-field">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-controls="register-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="field-wrap">
              <label htmlFor="register-confirm-password">Confirm Password</label>
              <div className="password-field">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-controls="register-confirm-password"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary full-width auth-submit"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account'} <span aria-hidden="true">&rarr;</span>
            </button>
          </form>

          <p className="auth-link">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
          <Link className="auth-home-link" to="/">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
        </section>
      </main>
    </>
  );
}
