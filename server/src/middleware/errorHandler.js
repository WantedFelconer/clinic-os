const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  console.error('Request failed:', isDev ? err.stack : err.message);

  // MySQL duplicate entry (errno 1062)
  if (err.errno === 1062) {
    return res.status(409).json({ message: 'Resource already exists.' });
  }

  // MySQL NOT NULL violation (errno 1048) or other constraint violations
  if (err.errno === 1048) {
    return res.status(400).json({ message: `Field '${err.sqlMessage?.match(/'([^']+)'/)?.[1] || 'unknown'}' is required.` });
  }

  // MySQL foreign key violation (errno 1452)
  if (err.errno === 1452) {
    return res.status(400).json({ message: 'Referenced resource not found.' });
  }

  // MySQL data truncation (errno 1265, 1406)
  if (err.errno === 1265 || err.errno === 1406) {
    return res.status(400).json({ message: 'Data value too large for the field.' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500
      ? (isDev ? err.message : 'Internal server error.')
      : err.message,
    ...(isDev && statusCode === 500 ? { error: err.message, stack: err.stack } : {}),
  });
};

module.exports = { errorHandler };
