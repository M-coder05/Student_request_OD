import React from 'react';

const STATUS_CLASSES = {
  Pending: 'status-pending',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
  'In Progress': 'status-progress',
  Resolved: 'status-resolved',
};

export default function StatusBadge({ status }) {
  const displayStatus = status || 'Pending';
  const statusClass = STATUS_CLASSES[displayStatus] || 'status-pending';

  return (
    <span className={`status-badge ${statusClass}`}>
      {displayStatus}
    </span>
  );
}
