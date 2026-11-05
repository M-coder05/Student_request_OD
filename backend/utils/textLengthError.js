const textLengthError = (fields) => {
  const exceededField = fields.find(({ value, maxLength }) => (
    typeof value === 'string' && value.length > maxLength
  ));

  if (!exceededField) {
    return null;
  }

  return `${exceededField.label} must be ${exceededField.maxLength} characters or fewer`;
};

module.exports = textLengthError;
