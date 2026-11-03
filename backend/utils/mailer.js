const sendMail = async ({ to, subject, html, text, isDemo = false }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || isDemo) {
    console.info('[email] Email logged instead of sent', { to, subject, text });
    return { sent: false };
  }

  const from = process.env.MAIL_FROM;
  if (!from) {
    throw new Error('MAIL_FROM must be configured to send email');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    if (response.ok) {
      throw new Error('Resend returned an invalid response');
    }
    result = { message: responseText };
  }

  if (!response.ok) {
    const detail = typeof result?.message === 'string' && result.message.trim()
      ? `: ${result.message}`
      : '';
    throw new Error(`Resend email request failed with status ${response.status}${detail}`);
  }

  return result;
};

module.exports = sendMail;
