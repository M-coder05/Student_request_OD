const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.name === 'CastError'
    ? 400
    : err.name === 'ValidationError'
      ? 400
      : err.code === 11000
        ? 409
        : err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.name === 'CastError'
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
