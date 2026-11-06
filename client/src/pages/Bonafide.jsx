import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import ButtonLoader from '../components/ButtonLoader';

export default function Bonafide() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    purpose: '',
    additionalDetails: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/bonafide', {
        method: 'POST',
        body: JSON.stringify({
          year: user?.year || 'I',
          semester: user?.semester || '1',
          purpose: formData.purpose,
          additionalDetails: formData.additionalDetails,
        }),
      });

      showToast('Bonafide request submitted successfully');
      setTimeout(() => {
        navigate('/status');
      }, 800);
    } catch (err) {
      showToast(err.message || 'Failed to submit bonafide request', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <div className="container form-page">
        <div className="page-head">
          <h2>Bonafide Certificate Request</h2>
          <Link className="btn btn-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>

        <form id="bonafideForm" className="card form-card" onSubmit={handleSubmit}>
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
              <label>Year</label>
              <input type="text" name="year" value={user?.year || ''} readOnly />
            </div>
          </div>

          <div className="two-col">
            <div className="field-wrap">
              <label>Semester</label>
              <input type="text" name="semester" value={user?.semester ? `Semester ${user.semester}` : ''} readOnly />
            </div>
            <div className="field-wrap">
              <label>Purpose</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                required
                disabled={loading}
              >
                <option value="">Select Purpose</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Bank Loan">Bank Loan</option>
                <option value="Passport">Passport</option>
                <option value="Internship">Internship</option>
                <option value="Higher Education">Higher Education</option>
                <option value="Bus Pass">Bus Pass</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="field-wrap">
            <label>Additional Details / Specific Requirements</label>
            <textarea
              name="additionalDetails"
              rows="4"
              placeholder="Mention organization name, scheme name, or format details"
              value={formData.additionalDetails}
              onChange={(e) => setFormData({ ...formData, additionalDetails: e.target.value })}
              disabled={loading}
            ></textarea>
          </div>

          <ButtonLoader
            type="submit"
            className="btn btn-primary"
            loading={loading}
            loadingText="Submitting…"
          >
            Submit Bonafide Request
          </ButtonLoader>
        </form>
      </div>
    </>
  );
}
