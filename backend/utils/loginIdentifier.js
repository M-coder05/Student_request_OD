const normalizeLoginIdentifier = (body) => {
  const identifier = typeof body?.email === 'string'
    ? body.email
    : typeof body?.registerNumber === 'string'
      ? body.registerNumber
      : '';
  return identifier.trim().toLowerCase();
};

module.exports = normalizeLoginIdentifier;
