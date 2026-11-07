const crypto = require('crypto');

const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const lowercase = 'abcdefghijkmnpqrstuvwxyz';
const digits = '23456789';
const alphabet = `${uppercase}${lowercase}${digits}`;

module.exports = () => {
  const password = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    digits[crypto.randomInt(digits.length)],
    ...Array.from({ length: 11 }, () => alphabet[crypto.randomInt(alphabet.length)]),
  ];

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join('');
};
