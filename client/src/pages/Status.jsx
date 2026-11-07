import React, { useState, useMemo, useCallback } from 'react';
import { apiDownload, apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StudentHeader from '../components/StudentHeader';
import StatusBadge from '../components/StatusBadge';
import DemoBanner from '../components/DemoBanner';
import { formatDateTime } from '../utils/formatDate';
import Skeleton from '../components/Skeleton';
import LoadError from '../components/LoadError';
import useLoading from '../hooks/useLoading';
import RequestAttachments from '../components/RequestAttachments';

export default function Status() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const loadRequests = useCallback(async () => {
    const data = await apiRequest('/requests/my');
    return data.requests || [];
  }, []);
  const {
    data: requests,
    loading,
    error,
    retry,
  } = useLoading(loadRequests, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const itemType = (item.type || item.requestType || '').toLowerCase();
      const itemStatus = (item.status || 'Pending').toLowerCase();

      const matchesType = !typeFilter || itemType === typeFilter.toLowerCase();
      const matchesStatus = !statusFilter || itemStatus === statusFilter.toLowerCase();

      return matchesType && matchesStatus;
    });
  }, [requests, typeFilter, statusFilter]);

  const requestSummary = useMemo(() => {
    return requests.reduce(
      (summary, request) => {
        const status = (request.status || 'Pending').toLowerCase();
        summary.total += 1;
        if (status === 'pending' || status === 'in progress') summary.inReview += 1;
        if (['approved', 'rejected', 'resolved'].includes(status)) summary.resolved += 1;
        return summary;
      },
      { total: 0, inReview: 0, resolved: 0 },
    );
  }, [requests]);

  const handleCertificateDownload = async (request) => {
    try {
      const pdf = await apiDownload(`/bonafide/${request._id}/certificate`);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${request.requestId}-certificate.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      showToast(downloadError.message || 'Unable to download certificate', 'error');
    }
  };

  return (
    <>
      <DemoBanner />
      <StudentHeader title="Request Status" showNav={false} />

      <main className="page-shell status-page-shell">
        <div className="container">
          <section className="status-page-heading" aria-labelledby="status-page-title">
            <div>
              <span className="eyebrow">Student services · request tracker</span>
              <h1 id="status-page-title">Your requests, at a glance.</h1>
              <p>Follow decisions and feedback on the services you have submitted.</p>
            </div>
            <div className="status-request-total" aria-label={`${loading ? 'Loading' : requestSummary.total} requests submitted`}>
              <strong>{loading ? '—' : requestSummary.total}</strong>
              <span>Requests submitted</span>
            </div>
          </section>

          <section className="status-summary" aria-label="Request summary">
            <div className="status-summary-item">
              <span className="status-summary-mark status-summary-review" aria-hidden="true" />
              <div>
                <strong>{loading ? '—' : requestSummary.inReview}</strong>
                <span>In review</span>
              </div>
            </div>
            <div className="status-summary-item">
              <span className="status-summary-mark status-summary-resolved" aria-hidden="true" />
              <div>
                <strong>{loading ? '—' : requestSummary.resolved}</strong>
                <span>Decision received</span>
              </div>
            </div>
            <p>Updates appear here as your requests move forward.</p>
          </section>

          <section className="status-list-section" aria-labelledby="status-list-title">
            <div className="status-list-heading">
              <div>
                <span className="status-section-label">Your activity</span>
                <h2 id="status-list-title">Request history</h2>
              </div>
              <span className="status-result-count" aria-live="polite">
                {loading ? 'Loading requests…' : `Showing ${filteredRequests.length} of ${requests.length}`}
              </span>
            </div>

            <div className="toolbar status-toolbar">
              <div className="filter-group">
                <label htmlFor="requestTypeFilter">Type</label>
                <select
                  id="requestTypeFilter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Leave">Leave</option>
                  <option value="OD">OD</option>
                  <option value="Bonafide">Bonafide</option>
                  <option value="Complaint">Complaint</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="statusFilter">Status</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="table-wrap card status-table-wrap">
              <table className="status-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Type</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Remark</th>
                    <th>Attachments</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody aria-busy={loading}>
                  {error ? (
                    <tr><td colSpan="7"><LoadError message={error} onRetry={retry} /></td></tr>
                  ) : loading ? (
                    <Skeleton variant="table-row" count={5} columns={7} />
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                        No requests found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((item) => (
                      <tr key={item._id || item.requestId}>
                        <td data-label="Request ID">
                          <span className="status-request-id">{item.requestId || item._id}</span>
                        </td>
                        <td data-label="Type">{item.type || item.requestType || 'Request'}</td>
                        <td data-label="Submitted">{formatDateTime(item.createdAt)}</td>
                        <td data-label="Status"><StatusBadge status={item.status} /></td>
                        <td data-label="Remark">{item.adminRemark || 'No remarks yet'}</td>
                        <td data-label="Attachments">
                          <RequestAttachments
                            requestType={item.type || item.requestType || 'request'}
                            requestId={item._id}
                            attachments={item.attachments || []}
                          />
                        </td>
                        <td data-label="Certificate">
                          {item.type === 'Bonafide' && item.status === 'Approved' && !item.revoked ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleCertificateDownload(item)}
                            >
                              {user?.demo === true ? 'Demo preview' : 'Download PDF'}
                            </button>
                          ) : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
