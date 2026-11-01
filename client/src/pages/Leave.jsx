import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';

export default function Leave() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/leave', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      showToast('Leave request submitted successfully');
      setTimeout(() => {
        navigate('/status');
      }, 800);
    } catch (err) {
      showToast(err.message || 'Failed to submit leave request', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <div className="container form-page">
        <div className="page-head">
          <h2>Leave Application</h2>
          <Link className="btn btn-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>

        <form id="leaveForm" className="card form-card" onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="field-wrap">
              <label>Student Name</label>
              <input type="text" name="studentName" value={user?.name || ''} readOnly />
            </div>
            <div className="field-wrap">
              <label>Register Number</label>
              <input type="text" name="registerNumber" value={user?.registerNumber || ''} readOnly />
            </div>
          </div>

          <div className="two-col">
            <div className="field-wrap">
              <label>Department</label>
              <input type="text" name="department" value={user?.department || ''} readOnly />
            </div>
            <div className="field-wrap">
              <label>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="two-col">
            <div className="field-wrap">
              <label>To Date</label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="field-wrap">
            <label>Reason for Leave</label>
            <textarea
              name="reason"
              rows="4"
              placeholder="Explain the reason for leave"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              disabled={loading}
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </>
  );
}
