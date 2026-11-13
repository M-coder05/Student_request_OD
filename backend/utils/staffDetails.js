const STAFF_DETAIL_FIELDS = [
  { name: 'designation', limit: 80 },
  { name: 'officeLocation', limit: 80 },
  { name: 'officeHours', limit: 120 },
  { name: 'meetingTopics', limit: 160 },
];

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

const validateStaffDetails = (body = {}) => {
  const value = {};

  for (const field of STAFF_DETAIL_FIELDS) {
    const raw = body[field.name];
    if (raw === undefined) continue;

    if (typeof raw !== 'string') {
      return { error: `${field.name} must be a string` };
    }
    if (CONTROL_CHARACTERS.test(raw)) {
      return { error: `${field.name} must not contain control characters` };
    }

    const trimmed = raw.trim();
    if (trimmed.length > field.limit) {
      return { error: `${field.name} must be at most ${field.limit} characters` };
    }
    if (trimmed.includes('<') || trimmed.includes('>')) {
      return { error: `${field.name} must be plain text` };
    }

    value[field.name] = trimmed;
  }

  return { value };
};

module.exports = { validateStaffDetails };
