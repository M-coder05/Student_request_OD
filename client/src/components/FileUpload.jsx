import React, { useRef, useState } from 'react';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than 5 MB.`;
  if (!ALLOWED_EXTENSIONS.test(file.name)) return `${file.name} must be a PDF, JPG or PNG file.`;
  return '';
};

const formatFileSize = (size) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileUpload({ label, files, onFilesChange, disabled = false, demo = false }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  if (demo) {
    return <p className="file-upload-demo" role="status">Uploads are turned off in demo mode.</p>;
  }

  const addFiles = (selectedFiles) => {
    const incoming = Array.from(selectedFiles);
    const invalidFile = incoming.map(validateFile).find(Boolean);
    if (invalidFile) {
      setError(invalidFile);
      return;
    }
    if (files.length + incoming.length > MAX_FILES) {
      setError('You can attach up to 3 files.');
      return;
    }
    setError('');
    onFilesChange([...files, ...incoming]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <div className="field-wrap file-upload">
      <label>{label}</label>
      <div
        className="file-upload-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        aria-label={`${label}. Drop PDF, JPG or PNG files here, or choose files.`}
      >
        <p>Drop files here, or choose from your device.</p>
        <small>PDF, JPG or PNG. Up to 3 files, 5 MB each.</small>
        <input
          ref={inputRef}
          className="file-upload-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          disabled={disabled}
          aria-label={`Choose ${label.toLowerCase()}`}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </button>
      </div>
      {error ? <p className="file-upload-error" role="alert">{error}</p> : null}
      {files.length ? (
        <ul className="file-upload-list" aria-label="Selected files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <span>{file.name} <small>{formatFileSize(file.size)}</small></span>
              <button
                type="button"
                className="file-upload-remove"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => {
                  onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
                  setError('');
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
