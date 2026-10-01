const { Registration, Event, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/registrations   (submit registration form)
// body: { eventId }
const createRegistration = asyncHandler(async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'eventId is required' });

  const event = await Event.findByPk(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Capacity check
  if (event.capacity) {
    const seatsTaken = await Registration.count({ where: { eventId, status: 'registered' } });
    if (seatsTaken >= event.capacity) {
      return res.status(409).json({ error: 'This event is fully booked' });
    }
  }

  // Reuse an existing (possibly cancelled) record instead of violating the
  // unique (userId, eventId) constraint if the user registers again.
  const [registration, created] = await Registration.findOrCreate({
    where: { userId: req.user.id, eventId },
    defaults: { status: 'registered' },
  });

  if (!created) {
    if (registration.status === 'registered') {
      return res.status(409).json({ error: 'You are already registered for this event' });
    }
    registration.status = 'registered';
    await registration.save();
  }

  res.status(201).json({ message: 'Registration successful', registration });
});

// GET /api/registrations/me   (view own registrations)
const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.findAll({
    where: { userId: req.user.id },
    include: [{ model: Event, as: 'event' }],
    order: [['createdAt', 'DESC']],
  });

  res.json({ count: registrations.length, registrations });
});

// PATCH /api/registrations/:id/cancel   (cancel own registration)
const cancelRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findByPk(req.params.id);
  if (!registration) return res.status(404).json({ error: 'Registration not found' });

  if (registration.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only cancel your own registration' });
  }
  if (registration.status === 'cancelled') {
    return res.status(400).json({ error: 'Registration is already cancelled' });
  }

  registration.status = 'cancelled';
  await registration.save();

  res.json({ message: 'Registration cancelled', registration });
});

module.exports = { createRegistration, getMyRegistrations, cancelRegistration };
