const express = require('express');
const {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
} = require('../controllers/eventController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/', listEvents);
router.get('/:id', getEvent);

// Organizer-only
router.post('/', requireAuth, requireRole('organizer'), createEvent);
router.put('/:id', requireAuth, requireRole('organizer'), updateEvent);
router.delete('/:id', requireAuth, requireRole('organizer'), deleteEvent);
router.get('/:id/registrations', requireAuth, requireRole('organizer'), getEventRegistrations);

module.exports = router;
