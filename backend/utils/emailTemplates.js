const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const buildRequestEmail = ({ requestId, type, oldStatus, newStatus, adminRemark }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const statusUrl = `${frontendUrl}/status`;
  const remark = adminRemark || 'No remark provided.';
  const statusChange = `${oldStatus} -> ${newStatus}`;
  const intro = oldStatus === 'Submitted'
    ? 'We received your request.'
    : 'Your request status has been updated.';

  return {
    subject: `${type} request ${requestId}: ${statusChange}`,
    text: [
      'Smart Student Service Portal',
      intro,
      `Request ID: ${requestId}`,
      `Type: ${type}`,
      `Status: ${statusChange}`,
      `Admin remark: ${remark}`,
      `View your request: ${statusUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#192b43;line-height:1.6;max-width:560px;margin:0 auto">
        <h1 style="font-size:22px;color:#182943">Smart Student Service Portal</h1>
        <p>${escapeHtml(intro)}</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><th align="left" style="padding:8px;border-bottom:1px solid #e2e8ef">Request ID</th><td style="padding:8px;border-bottom:1px solid #e2e8ef">${escapeHtml(requestId)}</td></tr>
          <tr><th align="left" style="padding:8px;border-bottom:1px solid #e2e8ef">Type</th><td style="padding:8px;border-bottom:1px solid #e2e8ef">${escapeHtml(type)}</td></tr>
          <tr><th align="left" style="padding:8px;border-bottom:1px solid #e2e8ef">Status</th><td style="padding:8px;border-bottom:1px solid #e2e8ef">${escapeHtml(statusChange)}</td></tr>
          <tr><th align="left" style="padding:8px">Admin remark</th><td style="padding:8px">${escapeHtml(remark)}</td></tr>
        </table>
        <p><a href="${escapeHtml(statusUrl)}" style="color:#2459c7">View your requests</a></p>
      </div>
    `,
  };
};

module.exports = { buildRequestEmail };
