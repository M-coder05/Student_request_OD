const sendMail = async ({ to, subject, html, text, isDemo = false }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || isDemo) {
    console.info('[email] Email logged instead of sent', { to, subject, text });
    return { sent: false };
  }

  if (!process.env.MAIL_FROM) {
    throw new Error('MAIL_FROM must be configured to send email');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email request failed with status ${response.status}`);
  }

  return response.json();
};

module.exports = sendMail;
