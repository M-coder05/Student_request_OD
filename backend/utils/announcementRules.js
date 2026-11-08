const AUDIENCES = ['all', 'students', 'staff'];
const STAFF_ROLES = ['faculty', 'hod', 'principal'];
const ADMIN_ROLES = ['admin', 'super_admin', 'demo_admin'];
const MAX_EXPIRY_DAYS = 365;

const validateAnnouncementInput = (body, now) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Announcement details are required' };
  }
  if (typeof body.title !== 'string') return { error: 'Title must be text' };
  if (typeof body.message !== 'string') return { error: 'Message must be text' };

  const title = body.title.trim();
  const message = body.message.trim();
  if (!title) return { error: 'Title is required' };
  if (title.length > 120) return { error: 'Title must be 120 characters or fewer' };
  if (!message) return { error: 'Message is required' };
  if (message.length > 1000) return { error: 'Message must be 1000 characters or fewer' };

  const audience = body.audience === undefined ? 'all' : body.audience;
  if (!AUDIENCES.includes(audience)) return { error: 'Audience must be all, students or staff' };
  if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
    return { error: 'Pinned must be a boolean' };
  }

  const value = {
    title,
    message,
    audience,
    pinned: body.pinned === true,
  };
  if (body.expiresAt !== undefined && body.expiresAt !== '') {
    if (typeof body.expiresAt !== 'string' && !(body.expiresAt instanceof Date)) {
      return { error: 'Expiry date must be a valid future date' };
    }
    const expiresAt = new Date(body.expiresAt);
    const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    const expiresAtTime = expiresAt.getTime();
    if (!Number.isFinite(expiresAtTime) || expiresAtTime <= nowTime) {
      return { error: 'Expiry date must be a valid future date' };
    }
    if (expiresAtTime > nowTime + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      return { error: 'Expiry date cannot be more than 365 days ahead' };
    }
    value.expiresAt = expiresAt;
  }

  return { value };
};

const buildVisibilityFilter = (user, now) => {
  const filter = {
    isDemo: user.isDemo === true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } },
    ],
  };
  if (ADMIN_ROLES.includes(user.role)) return filter;
  if (user.role === 'student') {
    filter.audience = { $in: ['all', 'students'] };
  } else if (STAFF_ROLES.includes(user.role)) {
    filter.audience = { $in: ['all', 'staff'] };
  } else {
    filter.audience = { $in: [] };
  }
  return filter;
};

const buildAdminScopeFilter = (user) => ({
  isDemo: user.role === 'demo_admin' && user.isDemo === true,
});

module.exports = {
  buildAdminScopeFilter,
  buildVisibilityFilter,
  validateAnnouncementInput,
};
