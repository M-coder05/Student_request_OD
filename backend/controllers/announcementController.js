const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const {
  buildAdminScopeFilter,
  buildVisibilityFilter,
  validateAnnouncementInput,
} = require('../utils/announcementRules');

const getAnnouncements = async (req, res) => {
  const announcements = await Announcement.find(buildVisibilityFilter(req.user, new Date()))
    .sort({ pinned: -1, createdAt: -1 })
    .limit(20);
  return res.status(200).json({ announcements });
};

const getManageAnnouncements = async (req, res) => {
  const announcements = await Announcement.find(buildAdminScopeFilter(req.user))
    .sort({ createdAt: -1 })
    .limit(100);
  return res.status(200).json({ announcements });
};

const recordAnnouncementAction = (req, action, announcement, details) => AuditLog.create({
  administratorId: req.user._id,
  administratorName: req.user.name,
  administratorRole: req.user.role,
  actorId: req.user._id,
  actorName: req.user.name,
  actorRole: req.user.role,
  action,
  recordType: 'Announcement',
  recordId: announcement._id,
  details,
  isDemo: req.user.role === 'demo_admin' && req.user.isDemo === true,
});

const createAnnouncement = async (req, res) => {
  const result = validateAnnouncementInput(req.body, new Date());
  if (result.error) return res.status(400).json({ message: result.error });

  const announcement = await Announcement.create({
    ...result.value,
    createdBy: req.user._id,
    createdByName: req.user.name,
    isDemo: req.user.role === 'demo_admin' && req.user.isDemo === true,
  });
  await recordAnnouncementAction(req, 'announcement_created', announcement, announcement.title);
  return res.status(201).json({ announcement });
};

const deleteAnnouncement = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'A valid announcement ID is required' });
  }
  const announcement = await Announcement.findOneAndDelete({
    _id: req.params.id,
    ...buildAdminScopeFilter(req.user),
  });
  if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

  await recordAnnouncementAction(req, 'announcement_deleted', announcement, announcement.title);
  return res.status(200).json({ message: 'Announcement deleted' });
};

module.exports = {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getManageAnnouncements,
};
