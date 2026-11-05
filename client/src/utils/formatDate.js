const format = (value, options) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return '-';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch {
    return '-';
  }
};

export const formatDate = (value) => format(value, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDateTime = (value) => format(value, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});
