import React from 'react';

export default function ButtonLoader({
  children,
  loading = false,
  loadingText,
  disabled = false,
  className = 'btn btn-primary',
  ...props
}) {
  return (
    <button
      {...props}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
