import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

      <main className="page-shell">
        <div className="container">
          <div className="toolbar">
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

          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Certificate</th>
                </tr>
              </thead>
              <tbody aria-busy={loading}>
                {error ? (
                  <tr><td colSpan="6"><LoadError message={error} onRetry={retry} /></td></tr>
                ) : loading ? (
                  <Skeleton variant="table-row" count={5} columns={6} />
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                      No requests found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => (
                    <tr key={item._id || item.requestId}>
                      <td>{item.requestId || item._id}</td>
                      <td>{item.type || item.requestType || 'Request'}</td>
                      <td>
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{item.adminRemark || 'No remarks yet'}</td>
                      <td>
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
        </div>
      </main>
    </>
  );
}
