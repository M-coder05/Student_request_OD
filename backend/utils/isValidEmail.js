const isValidEmail = (email) => {
  if (typeof email !== 'string' || email.length > 254) return false;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex > 64 || atIndex === email.length - 1) {
    return false;
  }

  let hasDomainDot = false;
  let previousDot = false;
  for (let index = 0; index < email.length; index += 1) {
    const character = email[index];
    const code = email.charCodeAt(index);
    if (code <= 32 || code === 127) return false;
    if (character === '@') continue;
    if (character === '.') {
      if (
        index === 0 ||
        index === atIndex - 1 ||
        index === atIndex + 1 ||
        index === email.length - 1 ||
        previousDot
      ) {
        return false;
      }
      if (index > atIndex + 1) hasDomainDot = true;
      previousDot = true;
    } else {
      previousDot = false;
    }
  }

  return hasDomainDot;
};

module.exports = isValidEmail;
