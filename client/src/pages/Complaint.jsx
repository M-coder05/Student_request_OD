import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import ButtonLoader from '../components/ButtonLoader';
import FileUpload from '../components/FileUpload';

export default function Complaint() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = attachments.length
        ? (() => {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => data.append(key, value));
            attachments.forEach((file) => data.append('attachments', file));
            return data;
          })()
        : JSON.stringify(formData);
      await apiRequest('/complaints', {
        method: 'POST',
        body,
      });

      showToast('Complaint submitted successfully');
      setTimeout(() => {
        navigate('/status');
      }, 800);
    } catch (err) {
      showToast(err.message || 'Failed to submit complaint', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <div className="container form-page">
        <div className="page-head">
          <h2>Student Complaint Registration</h2>
          <Link className="btn btn-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>

        <form id="complaintForm" className="card form-card" onSubmit={handleSubmit}>
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
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                disabled={loading}
              >
                <option value="">Select Category</option>
                <option value="Classroom">Classroom</option>
                <option value="Transport">Transport</option>
                <option value="Hostel">Hostel</option>
                <option value="Library">Library</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Canteen">Canteen</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <div className="field-wrap">
            <label>Subject</label>
            <input
              type="text"
              name="subject"
              placeholder="Brief summary of the issue"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="field-wrap">
            <label>Description</label>
            <textarea
              name="description"
              rows="5"
              placeholder="Provide detailed information regarding the complaint"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              disabled={loading}
            ></textarea>
          </div>

          <FileUpload
            label="Screenshot or document"
            files={attachments}
            onFilesChange={setAttachments}
            disabled={loading}
            demo={user?.demo === true}
          />

          <ButtonLoader
            type="submit"
            className="btn btn-primary"
            loading={loading}
            loadingText="Submitting…"
          >
            Submit Complaint
          </ButtonLoader>
        </form>
      </div>
    </>
  );
}
