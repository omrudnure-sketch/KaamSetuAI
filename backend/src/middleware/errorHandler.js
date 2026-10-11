export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req?.id || 'req-unknown';

  // Sanitized logging without exposing passwords, tokens, cookies, or secrets
  if (statusCode >= 500) {
    console.error(`[KaamSetu AI Server Error][Req: ${requestId}] ${req?.method} ${req?.originalUrl} - Status ${statusCode}:`, err.message || err);
  }

  // Sanitize internal error messages in production to prevent information disclosure
  const message =
    statusCode === 500 && isProduction
      ? 'Internal server error occurred'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      requestId,
    },
  });
};

