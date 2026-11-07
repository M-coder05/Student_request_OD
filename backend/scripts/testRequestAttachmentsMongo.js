if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run attachment integration tests in production.');
  process.exit(1);
}

if (!process.env.TEST_MONGO_URI) {
  console.error('Set TEST_MONGO_URI to a disposable MongoDB server. No .env file is loaded.');
  process.exit(1);
}

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'request-attachment-integration-test-secret';
process.env.DEMO_MODE = 'true';
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

const databaseName = `attachment_test_${Date.now()}_${process.pid}`;
const databaseUrl = new URL(process.env.TEST_MONGO_URI);
databaseUrl.pathname = `/${databaseName}`;
const databaseUri = databaseUrl.toString();
const uploadRoot = path.resolve(__dirname, '../uploads');

const notifyPath = require.resolve('../utils/notifyUser');
require.cache[notifyPath] = {
  id: notifyPath,
  filename: notifyPath,
  loaded: true,
  exports: async () => {},
};

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const LeaveRequest = require('../models/LeaveRequest');
const { deleteAttachments, createRequestWithAttachments } = require('../utils/requestAttachments');
const app = express();
app.use(express.json());
app.use('/api/leave', require('../routes/leaveRoutes'));
app.use('/api/od', require('../routes/odRoutes'));
app.use('/api/bonafide', require('../routes/bonafideRoutes'));
app.use('/api/complaints', require('../routes/complaintRoutes'));
app.use('/api/requests', require('../routes/requestsRoutes'));
app.use('/api/student', require('../routes/studentRoutes'));
app.use('/api/attachments', require('../routes/attachmentRoutes'));
app.use(require('../middleware/errorMiddleware'));

const pass = (description) => console.log(`PASS ${description}`);
const tokenFor = (user) => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
const bufferFor = {
  pdf: Buffer.from('%PDF-1.7\nattachment test\n'),
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

const createUser = (index, role = 'student', isDemo = false) => User.create({
  name: `Attachment Test ${index}`,
  registerNumber: `ATTACHMENT-${index}`,
  email: `attachment-${index}@example.test`,
  phone: '0000000000',
  department: 'Testing',
  year: '1',
  semester: '1',
  password: 'not-a-real-password',
  role,
  isDemo,
});

const appendLeaveFields = (form) => {
  form.append('fromDate', '2031-01-01');
  form.append('toDate', '2031-01-02');
  form.append('reason', 'Integration test request');
};

const appendFile = (form, name, buffer, contentType = 'application/octet-stream') => {
  form.append('attachments', new Blob([buffer], { type: contentType }), name);
};

const request = async (baseUrl, token, endpoint, options = {}) => fetch(`${baseUrl}${endpoint}`, {
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  },
});

const listFiles = async (directory) => {
  try {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }));
    return nested.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const makeLeaveFields = (user, requestId, status = 'Pending') => ({
  studentId: user._id,
  studentName: user.name,
  registerNumber: user.registerNumber,
  department: user.department,
  fromDate: '2031-01-01',
  toDate: '2031-01-02',
  reason: 'Integration test request',
  status,
  adminRemark: '',
  requestId,
});

const getStoredAttachment = async (requestId) => {
  const record = await LeaveRequest.findOne({ requestId }).select('+attachments.storageKey');
  assert.ok(record, `Expected request ${requestId} to exist`);
  assert.equal(record.attachments.length, 1);
  return { record, attachment: record.attachments[0] };
};

const main = async () => {
  let server;
  try {
    await mongoose.connect(databaseUri, { serverSelectionTimeoutMS: 5000 });
    const [owner, otherStudent, admin, demoStudent, demoAdmin, faculty, hod, principal, superAdmin] = await Promise.all([
      createUser(1),
      createUser(2),
      createUser(3, 'admin'),
      createUser(4, 'student', true),
      createUser(5, 'demo_admin', true),
      createUser(6, 'faculty'),
      createUser(7, 'hod'),
      createUser(8, 'principal'),
      createUser(9, 'super_admin'),
    ]);
    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const ownerToken = tokenFor(owner);
    const otherToken = tokenFor(otherStudent);
    const adminToken = tokenFor(admin);
    const demoStudentToken = tokenFor(demoStudent);
    const demoAdminToken = tokenFor(demoAdmin);
    const roleTokens = {
      faculty: tokenFor(faculty),
      hod: tokenFor(hod),
      principal: tokenFor(principal),
      admin: adminToken,
      'super admin': tokenFor(superAdmin),
    };

    const studentOnlyReadEndpoints = [
      '/api/leave/my',
      '/api/leave/not-a-valid-id',
      '/api/od/my',
      '/api/od/not-a-valid-id',
      '/api/bonafide/my',
      '/api/bonafide/not-a-valid-id',
      '/api/bonafide/not-a-valid-id/certificate',
      '/api/complaints/my',
      '/api/complaints/not-a-valid-id',
      '/api/requests/my',
      '/api/student/dashboard',
      '/api/student/profile',
    ];
    const studentOnlyPostEndpoints = [
      '/api/leave',
      '/api/od',
      '/api/bonafide',
      '/api/complaints',
    ];
    for (const [role, token] of Object.entries(roleTokens)) {
      for (const endpoint of studentOnlyReadEndpoints) {
        const response = await request(baseUrl, token, endpoint);
        assert.equal(response.status, 403, `${role} should not read ${endpoint}`);
      }
      for (const endpoint of studentOnlyPostEndpoints) {
        const response = await request(baseUrl, token, endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        assert.equal(response.status, 403, `${role} should not post to ${endpoint}`);
      }
      const uploadForm = new FormData();
      appendLeaveFields(uploadForm);
      appendFile(uploadForm, 'blocked.pdf', bufferFor.pdf, 'application/pdf');
      const blockedUpload = await request(baseUrl, token, '/api/leave', {
        method: 'POST',
        body: uploadForm,
      });
      assert.equal(blockedUpload.status, 403, `${role} should not upload request attachments`);
      const profileUpdate = await request(baseUrl, token, '/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(profileUpdate.status, 403, `${role} should not update a student profile`);
    }
    const demoRequests = await request(baseUrl, demoStudentToken, '/api/requests/my');
    assert.equal(demoRequests.status, 200);
    pass('faculty, HOD, principal, admin and super admin are denied student-only request/profile routes; demo students retain access');

    const validForm = new FormData();
    appendLeaveFields(validForm);
    appendFile(validForm, 'proof.pdf', bufferFor.pdf, 'application/pdf');
    appendFile(validForm, 'proof.jpg', bufferFor.jpg, 'image/jpeg');
    appendFile(validForm, 'proof.png', bufferFor.png, 'image/png');
    const validResponse = await request(baseUrl, ownerToken, '/api/leave', {
      method: 'POST',
      body: validForm,
    });
    const validData = await validResponse.json();
    assert.equal(validResponse.status, 201);
    assert.deepEqual(validData.request.attachments.map((file) => file.mimeType), [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]);
    assert.ok(validData.request.attachments.every((file) => !('storageKey' in file) && !('url' in file)));
    pass('valid PDF, JPG and PNG accepted; no storage key or URL in response');

    const storedRequest = await LeaveRequest.findById(validData.request._id);
    assert.equal(storedRequest.attachments.length, 3);
    const safeObject = storedRequest.toObject();
    assert.ok(safeObject.attachments.every((file) => !('storageKey' in file) && !('url' in file)));
    const serializedRequest = JSON.stringify(storedRequest.toJSON());
    assert.equal(serializedRequest.includes('storageKey'), false);
    assert.equal(serializedRequest.includes('publicUrl'), false);
    const rawDocument = await LeaveRequest.collection.findOne({ _id: storedRequest._id });
    assert.ok(rawDocument.attachments.every((file) => file.storageKey.startsWith('local:')));
    assert.ok(rawDocument.attachments.every((file) => !('url' in file) && !('publicUrl' in file)));
    pass('request queries expose attachment metadata only; MongoDB stores no public URLs');

    const jsonResponse = await request(baseUrl, ownerToken, '/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromDate: '2031-02-01',
        toDate: '2031-02-02',
        reason: 'Request without attachments',
      }),
    });
    const jsonData = await jsonResponse.json();
    assert.equal(jsonResponse.status, 201);
    assert.equal(Object.hasOwn(jsonData.request, 'attachments'), false);
    pass('plain JSON requests keep working without an attachments field');

    const exeForm = new FormData();
    appendLeaveFields(exeForm);
    appendFile(exeForm, 'program.pdf', Buffer.from('MZ executable signature'), 'application/pdf');
    const exeResponse = await request(baseUrl, ownerToken, '/api/leave', {
      method: 'POST',
      body: exeForm,
    });
    assert.equal(exeResponse.status, 400);
    assert.equal((await exeResponse.json()).message, 'Attachments must be PDF, JPG or PNG files.');
    pass('an .exe renamed to .pdf is rejected by signature');

    const oversizedForm = new FormData();
    appendLeaveFields(oversizedForm);
    appendFile(oversizedForm, 'oversized.pdf', Buffer.alloc(6 * 1024 * 1024), 'application/pdf');
    const oversizedResponse = await request(baseUrl, ownerToken, '/api/leave', {
      method: 'POST',
      body: oversizedForm,
    });
    assert.equal(oversizedResponse.status, 400);
    assert.match((await oversizedResponse.json()).message, /5 MB/);
    pass('a 6 MB file is rejected with a clean 400');

    const tooManyForm = new FormData();
    appendLeaveFields(tooManyForm);
    for (let index = 0; index < 4; index += 1) {
      appendFile(tooManyForm, `proof-${index}.pdf`, bufferFor.pdf, 'application/pdf');
    }
    const tooManyResponse = await request(baseUrl, ownerToken, '/api/leave', {
      method: 'POST',
      body: tooManyForm,
    });
    assert.equal(tooManyResponse.status, 400);
    assert.match((await tooManyResponse.json()).message, /maximum of 3/);
    pass('four files are rejected with a clean 400');

    const ownerAttachment = validData.request.attachments[0];
    const attachmentEndpoint = `/api/attachments/leave/${validData.request._id}/${ownerAttachment._id}`;
    const ownerDownload = await request(baseUrl, ownerToken, attachmentEndpoint);
    assert.equal(ownerDownload.status, 200);
    assert.equal(ownerDownload.headers.get('cache-control'), 'no-store');
    assert.equal(ownerDownload.headers.get('content-type'), 'application/pdf');
    assert.match(ownerDownload.headers.get('content-disposition'), /^attachment;/i);
    assert.deepEqual(Buffer.from(await ownerDownload.arrayBuffer()), bufferFor.pdf);
    pass('request owner can download an attachment with Content-Disposition: attachment');

    const otherDownload = await request(baseUrl, otherToken, attachmentEndpoint);
    assert.equal(otherDownload.status, 404);
    pass('another student receives 404');

    const adminDownload = await request(baseUrl, adminToken, attachmentEndpoint);
    assert.equal(adminDownload.status, 200);
    assert.equal(await AuditLog.countDocuments({
      administratorId: admin._id,
      action: 'attachment_downloaded',
      recordId: validData.request._id,
    }), 1);
    pass('admin can download and the download is audited');

    for (const [role, token] of Object.entries(roleTokens).filter(([role]) => !['admin', 'super admin'].includes(role))) {
      const response = await request(baseUrl, token, attachmentEndpoint);
      assert.equal(response.status, 403, `${role} must not download another account's attachment`);
    }
    for (const token of [roleTokens.admin, roleTokens['super admin']]) {
      const response = await request(baseUrl, token, attachmentEndpoint);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-disposition'), /^attachment;/i);
    }
    pass('staff cannot download attachments; admin and super admin downloads remain allowed');

    const demoRequest = await createRequestWithAttachments(
      LeaveRequest,
      makeLeaveFields(demoStudent, 'ATTACHMENT-DEMO-REQUEST'),
      [{ originalname: 'demo.pdf', buffer: bufferFor.pdf, size: bufferFor.pdf.length }],
      'leave'
    );
    const demoDownload = await request(
      baseUrl,
      demoAdminToken,
      `/api/attachments/leave/${demoRequest._id}/${demoRequest.attachments[0]._id}`
    );
    assert.equal(demoDownload.status, 200);
    const isolatedDownload = await request(baseUrl, demoAdminToken, attachmentEndpoint);
    assert.equal(isolatedDownload.status, 404);
    pass('demo admin accesses demo data but receives 404 for non-demo data');

    const demoUploadForm = new FormData();
    appendLeaveFields(demoUploadForm);
    appendFile(demoUploadForm, 'demo.pdf', bufferFor.pdf, 'application/pdf');
    const demoUpload = await request(baseUrl, demoStudentToken, '/api/leave', {
      method: 'POST',
      body: demoUploadForm,
    });
    assert.equal(demoUpload.status, 403);
    assert.equal((await demoUpload.json()).message, 'Uploads are turned off in demo mode.');
    pass('demo upload is blocked with the specified message');

    const forgedBonafide = await request(baseUrl, ownerToken, '/api/bonafide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'Scholarship', year: '99', semester: '99' }),
    });
    assert.equal(forgedBonafide.status, 201);
    const forgedBonafideBody = await forgedBonafide.json();
    const savedBonafide = await require('../models/BonafideRequest').findById(forgedBonafideBody.request._id);
    assert.equal(savedBonafide.year, owner.year);
    assert.equal(savedBonafide.semester, owner.semester);
    const invalidPurpose = await request(baseUrl, ownerToken, '/api/bonafide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'Forged purpose', year: '1', semester: '1' }),
    });
    assert.equal(invalidPurpose.status, 400);
    const invalidCategory = await request(baseUrl, ownerToken, '/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Forged category', subject: 'Test', description: 'Test' }),
    });
    assert.equal(invalidCategory.status, 400);
    pass('bonafide year/semester come from the account; invalid purpose and complaint category are rejected');

    const pending = await createRequestWithAttachments(
      LeaveRequest,
      makeLeaveFields(owner, 'ATTACHMENT-PENDING-DELETE'),
      [{ originalname: 'pending.pdf', buffer: bufferFor.pdf, size: bufferFor.pdf.length }],
      'leave'
    );
    const pendingAttachment = pending.attachments[0];
    const pendingPath = path.resolve(uploadRoot, pendingAttachment.storageKey.slice('local:'.length));
    const nonOwnerDelete = await request(
      baseUrl,
      otherToken,
      `/api/leave/${pending._id}/attachments/${pendingAttachment._id}`,
      { method: 'DELETE' }
    );
    assert.equal(nonOwnerDelete.status, 404);
    await fs.promises.access(pendingPath);
    pass('a non-owner cannot delete an attachment');
    const deletePending = await request(
      baseUrl,
      ownerToken,
      `/api/leave/${pending._id}/attachments/${pendingAttachment._id}`,
      { method: 'DELETE' }
    );
    assert.equal(deletePending.status, 200);
    await assert.rejects(fs.promises.access(pendingPath));
    pass('owner can delete an attachment while Pending and storage is removed');

    const approved = await createRequestWithAttachments(
      LeaveRequest,
      makeLeaveFields(owner, 'ATTACHMENT-APPROVED-DELETE', 'Approved'),
      [{ originalname: 'approved.pdf', buffer: bufferFor.pdf, size: bufferFor.pdf.length }],
      'leave'
    );
    const approvedAttachment = approved.attachments[0];
    const approvedPath = path.resolve(uploadRoot, approvedAttachment.storageKey.slice('local:'.length));
    const deleteApproved = await request(
      baseUrl,
      ownerToken,
      `/api/leave/${approved._id}/attachments/${approvedAttachment._id}`,
      { method: 'DELETE' }
    );
    assert.equal(deleteApproved.status, 400);
    await fs.promises.access(approvedPath);
    pass('owner cannot delete an attachment after the request leaves Pending');

    const filesBeforeFailedCreate = await listFiles(uploadRoot);
    await assert.rejects(
      createRequestWithAttachments(
        { create: async () => { throw new Error('test create failure'); } },
        {},
        [{ originalname: 'orphan.pdf', buffer: bufferFor.pdf, size: bufferFor.pdf.length }],
        'leave'
      ),
      /test create failure/
    );
    assert.deepEqual(await listFiles(uploadRoot), filesBeforeFailedCreate);
    pass('uploaded files are removed when request creation fails');

    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const filesBeforeProductionUpload = await listFiles(uploadRoot);
      const productionForm = new FormData();
      appendLeaveFields(productionForm);
      appendFile(productionForm, 'production.pdf', bufferFor.pdf, 'application/pdf');
      const productionUpload = await request(baseUrl, ownerToken, '/api/leave', {
        method: 'POST',
        body: productionForm,
      });
      assert.equal(productionUpload.status, 503);
      assert.deepEqual(await listFiles(uploadRoot), filesBeforeProductionUpload);
      pass('production upload without Cloudinary returns 503 and writes nothing to disk');
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }

    let rateLimited = false;
    for (let index = 0; index < 25; index += 1) {
      const response = await request(baseUrl, ownerToken, '/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (response.status === 429) {
        rateLimited = true;
        assert.match((await response.json()).message, /Too many upload requests/);
        break;
      }
    }
    assert.equal(rateLimited, true);
    pass('request upload endpoints are rate-limited');

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState) {
      if (process.env.NODE_ENV === 'production') process.env.NODE_ENV = 'test';
      const requestModels = [LeaveRequest];
      for (const Model of requestModels) {
        const records = await Model.find({}).select('+attachments.storageKey').catch(() => []);
        const attachments = records.flatMap((record) => record.attachments || []);
        await deleteAttachments(attachments).catch((error) => {
          console.error('Cleanup failed for an attachment test file.');
          process.exitCode = 1;
        });
      }
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
};

main().catch((error) => {
  console.error(`FAIL attachment integration test: ${error.message}`);
  process.exitCode = 1;
});
