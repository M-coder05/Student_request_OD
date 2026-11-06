import React, { useState } from 'react';

export default function PasswordInput({ id, className = '', ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        {...inputProps}
        id={id}
        type={isVisible ? 'text' : 'password'}
        className={className}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-controls={id}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
      >
        <i className={`fa-solid ${isVisible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
