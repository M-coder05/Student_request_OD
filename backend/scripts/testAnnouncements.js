const assert = require('node:assert/strict');
const adminMiddleware = require('../middleware/adminMiddleware');
const announcementRoutes = require('../routes/announcementRoutes');
const {
  buildAdminScopeFilter,
  buildVisibilityFilter,
  validateAnnouncementInput,
} = require('../utils/announcementRules');

const now = new Date('2026-11-08T12:00:00.000Z');
const validInput = {
  title: '  Campus update  ',
  message: '  The campus office will close early today.  ',
  audience: 'all',
  pinned: true,
};

const getRoute = (method, path) => announcementRoutes.stack.find((layer) => (
  layer.route && layer.route.path === path && layer.route.methods[method]
));

const hasAdminMiddleware = (route) => route.route.stack.some((layer) => layer.handle === adminMiddleware);

const testAnnouncementValidation = () => {
  const valid = validateAnnouncementInput(validInput, now);
  assert.ok(valid.value);
  assert.equal(valid.value.title, 'Campus update');
  assert.equal(valid.value.message, 'The campus office will close early today.');
  assert.equal(valid.value.audience, 'all');
  assert.equal(valid.value.pinned, true);
  assert.deepEqual(validateAnnouncementInput({ ...validInput, title: '  ' }, now), {
    error: 'Title is required',
  });
  assert.match(validateAnnouncementInput({ ...validInput, title: 'x'.repeat(121) }, now).error, /120/);
  assert.match(validateAnnouncementInput({ ...validInput, message: 'x'.repeat(1001) }, now).error, /1000/);
  assert.match(validateAnnouncementInput({ ...validInput, audience: 'parents' }, now).error, /Audience/);
  for (const title of [[], {}, 12]) {
    assert.match(validateAnnouncementInput({ ...validInput, title }, now).error, /Title must be text/);
  }
  assert.match(validateAnnouncementInput({ ...validInput, expiresAt: '2026-11-08T11:59:59.999Z' }, now).error, /future/);
  assert.match(validateAnnouncementInput({ ...validInput, expiresAt: '2027-11-08T12:00:00.001Z' }, now).error, /365 days/);
  const futureExpiry = validateAnnouncementInput({
    ...validInput,
    title: '  Trimmed title ',
    message: ' Trimmed message  ',
    expiresAt: '2026-11-09T12:00:00.000Z',
  }, now);
  assert.equal(futureExpiry.value.title, 'Trimmed title');
  assert.equal(futureExpiry.value.message, 'Trimmed message');
  assert.equal(futureExpiry.value.expiresAt.toISOString(), '2026-11-09T12:00:00.000Z');
  console.log('PASS: Announcement validation checks valid input, limits, audiences, text types, expiry bounds, and trimming.');
};

const testVisibilityFilters = () => {
  const realStudent = buildVisibilityFilter({ role: 'student', isDemo: false }, now);
  const demoStudent = buildVisibilityFilter({ role: 'student', isDemo: true }, now);
  assert.equal(realStudent.isDemo, false);
  assert.equal(demoStudent.isDemo, true);
  assert.deepEqual(realStudent.audience, { $in: ['all', 'students'] });
  assert.deepEqual(demoStudent.audience, { $in: ['all', 'students'] });

  for (const role of ['faculty', 'hod', 'principal']) {
    assert.deepEqual(
      buildVisibilityFilter({ role, isDemo: false }, now).audience,
      { $in: ['all', 'staff'] }
    );
  }
  for (const role of ['admin', 'super_admin', 'demo_admin']) {
    const filter = buildVisibilityFilter({ role, isDemo: role === 'demo_admin' }, now);
    assert.equal(Object.hasOwn(filter, 'audience'), false);
  }
  assert.ok(realStudent.$or.some((condition) => condition.expiresAt?.$gt === now));
  assert.ok(realStudent.$or.some((condition) => condition.expiresAt === null));
  assert.ok(realStudent.$or.some((condition) => condition.expiresAt?.$exists === false));
  console.log('PASS: Announcement visibility covers student, staff, admin and demo roles, audience scope, isolation and expiry exclusion.');
};

const testAdminScope = () => {
  assert.deepEqual(buildAdminScopeFilter({ role: 'admin', isDemo: false }), { isDemo: false });
  assert.deepEqual(buildAdminScopeFilter({ role: 'super_admin', isDemo: false }), { isDemo: false });
  assert.deepEqual(buildAdminScopeFilter({ role: 'demo_admin', isDemo: true }), { isDemo: true });
  assert.deepEqual(buildAdminScopeFilter({ role: 'demo_admin', isDemo: false }), { isDemo: false });
  console.log('PASS: Announcement management scope separates real admins from demo admins.');
};

const testRouteWiring = () => {
  const listRoute = getRoute('get', '/');
  const manageRoute = getRoute('get', '/manage');
  const createRoute = getRoute('post', '/');
  const deleteRoute = getRoute('delete', '/:id');
  assert.ok(listRoute);
  assert.ok(manageRoute);
  assert.ok(createRoute);
  assert.ok(deleteRoute);
  assert.equal(hasAdminMiddleware(listRoute), false);
  assert.equal(hasAdminMiddleware(manageRoute), true);
  assert.equal(hasAdminMiddleware(createRoute), true);
  assert.equal(hasAdminMiddleware(deleteRoute), true);
  assert.ok(announcementRoutes.stack.some((layer) => layer.name === 'authMiddleware'));
  console.log('PASS: Announcement list is not admin-only; manage, create and delete routes require admin middleware.');
};

testAnnouncementValidation();
testVisibilityFilters();
testAdminScope();
testRouteWiring();
