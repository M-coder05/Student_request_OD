import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DemoBanner from '../components/DemoBanner';
import ButtonLoader from '../components/ButtonLoader';
import FileUpload from '../components/FileUpload';

export default function OD() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    eventLocation: '',
    organizer: '',
    reason: '',
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
      await apiRequest('/od', {
        method: 'POST',
        body,
      });

      showToast('On-duty request submitted successfully');
      setTimeout(() => {
        navigate('/status');
      }, 800);
    } catch (err) {
      showToast(err.message || 'Failed to submit OD request', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <DemoBanner />
      <div className="container form-page">
        <div className="page-head">
          <h2>On-Duty Application</h2>
          <Link className="btn btn-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>

        <form id="odForm" className="card form-card" onSubmit={handleSubmit}>
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
              <label>Event Name</label>
              <input
                type="text"
                name="eventName"
                placeholder="Symposium / Workshop / Sports"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="two-col">
            <div className="field-wrap">
              <label>Event Date</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="field-wrap">
              <label>Event Location</label>
              <input
                type="text"
                name="eventLocation"
                placeholder="College / Venue"
                value={formData.eventLocation}
                onChange={(e) => setFormData({ ...formData, eventLocation: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="field-wrap">
            <label>Organizer</label>
            <input
              type="text"
              name="organizer"
              placeholder="Department / Organization"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="field-wrap">
            <label>Reason / Participation Details</label>
            <textarea
              name="reason"
              rows="4"
              placeholder="Mention paper presentation, coding event, sports, etc."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              disabled={loading}
            ></textarea>
          </div>

          <FileUpload
            label="Invitation or permission letter"
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
            Submit OD Request
          </ButtonLoader>
        </form>
      </div>
    </>
  );
}
