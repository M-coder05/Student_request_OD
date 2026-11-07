const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAppointmentsEnabledForRealStudents = require('../middleware/appointmentFeatureMiddleware');
const {
  cancelAppointment,
  createAppointment,
  decideAppointment,
  downloadAppointmentCalendar,
  getAvailableSlots,
  getBookableStaff,
  getMyAppointments,
  getStaffQueue,
  updateAppointmentOutcome,
} = require('../controllers/appointmentController');

const router = express.Router();

router.use(authMiddleware);
router.get('/staff', requireAppointmentsEnabledForRealStudents, getBookableStaff);
router.get('/staff/:id/slots', getAvailableSlots);
router.post('/', requireAppointmentsEnabledForRealStudents, createAppointment);
router.get('/mine', getMyAppointments);
router.patch('/:id/cancel', cancelAppointment);
router.get('/:id/calendar', downloadAppointmentCalendar);
router.get('/staff-queue', getStaffQueue);
router.patch('/:id/decision', decideAppointment);
router.patch('/:id/complete', (req, res) => updateAppointmentOutcome(req, res, 'Completed'));
router.patch('/:id/no-show', (req, res) => updateAppointmentOutcome(req, res, 'No-show'));

module.exports = router;
