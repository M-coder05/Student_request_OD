const safeRequestUrl = (req) => String(req.originalUrl || req.url || '')
  .replace(/(\/(?:reset-password|password-reset|token)\/)[^/?#]+/gi, '$1[redacted]')
  .replace(/([?&][^=&#]*token[^=&#]*=)[^&#]*/gi, '$1[redacted]');

module.exports = safeRequestUrl;
