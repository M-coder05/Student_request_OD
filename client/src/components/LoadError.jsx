import React from 'react';

export default function LoadError({ message, onRetry }) {
  return (
    <div className="load-error" role="alert">
      <p><strong>Unable to load data.</strong> {message}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
