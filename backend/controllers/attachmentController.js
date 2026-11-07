const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const LeaveRequest = require('../models/LeaveRequest');
const ODRequest = require('../models/ODRequest');
const BonafideRequest = require('../models/BonafideRequest');
const Complaint = require('../models/Complaint');
const { isDemoUser } = require('../config/demo');
const { deleteAttachment, downloadAttachment } = require('../utils/requestAttachments');

const REQUEST_MODELS = {
  leave: LeaveRequest,
  od: ODRequest,
  bonafide: BonafideRequest,
  complaint: Complaint,
};

const getRequestFilter = async (req, requestId) => {
  const filter = { _id: requestId };
  const isAdministrator = ['admin', 'super_admin'].includes(req.user.role) && !isDemoUser(req.user);
  const isDemoAdministrator = req.user.role === 'demo_admin' && isDemoUser(req.user);

  if (isAdministrator) return { filter, isAdministrator };
  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
    return { filter, isAdministrator: false };
  }
  if (isDemoAdministrator) {
    const demoStudent = await User.findOne({ role: 'student', isDemo: true }).select('_id');
    filter.studentId = demoStudent?._id || { $in: [] };
    return { filter, isAdministrator: true };
  }
  return null;
};

const getAttachment = (request, attachmentId) => (
  request.attachments?.find((attachment) => String(attachment._id) === String(attachmentId))
);

const downloadRequestAttachment = async (req, res) => {
  const Model = REQUEST_MODELS[String(req.params.requestType).toLowerCase()];
  if (!Model || !mongoose.isValidObjectId(req.params.requestId) || !mongoose.isValidObjectId(req.params.attachmentId)) {
    return res.status(404).json({ message: 'Attachment not found' });
  }

  const access = await getRequestFilter(req, req.params.requestId);
  if (!access) return res.status(404).json({ message: 'Attachment not found' });
  const request = await Model.findOne(access.filter).select('+attachments.storageKey');
  const attachment = request && getAttachment(request, req.params.attachmentId);
  if (!request || !attachment) return res.status(404).json({ message: 'Attachment not found' });

  if (access.isAdministrator) {
    await AuditLog.create({
      administratorId: req.user._id,
      administratorName: req.user.name,
      administratorRole: req.user.role,
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'attachment_downloaded',
      recordType: `${req.params.requestType}Attachment`,
      recordId: request._id,
      details: `Downloaded ${attachment.originalName} (${attachment._id})`,
      isDemo: isDemoUser(req.user),
    });
  }

  const { redirectUrl, filePath } = await downloadAttachment(attachment);
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (redirectUrl) return res.redirect(302, redirectUrl);
  res.attachment(attachment.originalName);
  res.type(attachment.mimeType);
  const stream = require('fs').createReadStream(filePath);
  stream.on('error', (error) => {
    console.error('[attachments] Failed to stream a local attachment:', error.message);
    if (!res.headersSent) res.status(404).json({ message: 'Attachment file is unavailable' });
    else res.destroy(error);
  });
  return stream.pipe(res);
};

const deleteRequestAttachment = (requestType) => async (req, res) => {
  const Model = REQUEST_MODELS[requestType];
  if (!Model || !mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.attachmentId)) {
    return res.status(404).json({ message: 'Attachment not found' });
  }
  if (req.user.role !== 'student') return res.status(404).json({ message: 'Attachment not found' });

  const request = await Model.findOne({ _id: req.params.id, studentId: req.user._id })
    .select('+attachments.storageKey');
  const attachment = request && getAttachment(request, req.params.attachmentId);
  if (!request || !attachment) return res.status(404).json({ message: 'Attachment not found' });
  if (request.status !== 'Pending') {
    return res.status(400).json({ message: 'Attachments can only be removed while the request is Pending.' });
  }

  await deleteAttachment(attachment);
  request.attachments = request.attachments.filter((item) => String(item._id) !== String(attachment._id));
  if (!request.attachments.length) request.set('attachments', undefined);
  await request.save();
  return res.status(200).json({ message: 'Attachment deleted' });
};

module.exports = { deleteRequestAttachment, downloadRequestAttachment };
