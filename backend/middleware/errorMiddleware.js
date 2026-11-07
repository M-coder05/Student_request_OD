const errorMiddleware = (err, req, res, next) => {
  const multerMessages = {
    LIMIT_FILE_SIZE: 'Each attachment must be 5 MB or smaller.',
    LIMIT_FILE_COUNT: 'A maximum of 3 attachments is allowed.',
    LIMIT_UNEXPECTED_FILE: 'Use the attachments field and include no more than 3 files.',
    LIMIT_FIELD_COUNT: 'Too many form fields were submitted.',
    LIMIT_FIELD_VALUE: 'A form field exceeds the allowed size.',
    LIMIT_PART_COUNT: 'Too many form fields or files were submitted.',
  };
  const isMulterError = err.name === 'MulterError' || Boolean(multerMessages[err.code]);
  const statusCode = isMulterError
    ? 400
    : err.name === 'CastError'
    ? 400
    : err.name === 'ValidationError'
      ? 400
      : err.code === 11000
        ? 409
        : err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = isMulterError
    ? multerMessages[err.code] || 'Invalid attachment upload.'
    : err.name === 'CastError'
    ? 'Invalid resource identifier'
    : err.name === 'ValidationError'
      ? 'Validation failed'
      : err.code === 11000
        ? 'A record with this value already exists'
        : statusCode >= 500
          ? 'Server Error'
          : err.message || 'Request failed';

  const response = { message };
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
