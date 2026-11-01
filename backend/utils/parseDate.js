const parseDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

module.exports = parseDate;
