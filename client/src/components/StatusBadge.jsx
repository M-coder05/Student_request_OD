import React from 'react';

const STATUS_CLASSES = {
  Pending: 'status-pending',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
  'In Progress': 'status-progress',
  Resolved: 'status-resolved',
  Rescheduled: 'status-progress',
  Cancelled: 'status-rejected',
  Completed: 'status-approved',
  'No-show': 'status-rejected',
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
