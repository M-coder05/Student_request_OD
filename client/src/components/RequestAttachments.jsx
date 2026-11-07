import React, { useState } from 'react';
import { apiDownload } from '../api/client';
import { formatDate } from '../utils/formatDate';

const formatFileSize = (size) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RequestAttachments({ requestType, requestId, attachments = [] }) {
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');

  const download = async (attachment) => {
    setDownloadingId(attachment._id);
    setError('');
    try {
      const file = await apiDownload(
        `/attachments/${encodeURIComponent(requestType.toLowerCase())}/${encodeURIComponent(requestId)}/${encodeURIComponent(attachment._id)}`
      );
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.originalName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download attachment.');
    } finally {
      setDownloadingId('');
    }
  };

  if (!attachments.length) return <span className="muted">No attachments</span>;

  return (
    <div className="request-attachments">
      <ul>
        {attachments.map((attachment) => (
          <li key={attachment._id}>
            <span>
              {attachment.originalName}
              <small>{formatFileSize(attachment.size)} · Uploaded {formatDate(attachment.uploadedAt)}</small>
            </span>
            <a
              href={`/api/attachments/${encodeURIComponent(requestType.toLowerCase())}/${encodeURIComponent(requestId)}/${encodeURIComponent(attachment._id)}`}
              onClick={(event) => {
                event.preventDefault();
                if (!downloadingId) download(attachment);
              }}
              aria-disabled={Boolean(downloadingId)}
            >
              {downloadingId === attachment._id ? 'Downloading…' : 'Download'}
            </a>
          </li>
        ))}
      </ul>
      {error ? <p className="file-upload-error" role="alert">{error}</p> : null}
    </div>
  );
}
