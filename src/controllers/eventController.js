const { Op } = require('sequelize');
const { Event, User, Registration } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/events
// Query params: ?upcoming=true&search=keyword&page=1&limit=10
const listEvents = asyncHandler(async (req, res) => {
  const { upcoming, search, page = 1, limit = 10 } = req.query;
  const where = {};

  if (upcoming === 'true') {
    where.dateTime = { [Op.gte]: new Date() };
  }
  if (search) {
    where.title = { [Op.like]: `%${search}%` };
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Event.findAndCountAll({
    where,
    include: [{ model: User, as: 'organizer', attributes: ['id', 'name', 'email'] }],
    order: [['dateTime', 'ASC']],
    limit: Number(limit),
    offset,
  });

  res.json({
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / Number(limit)),
    events: rows,
  });
});

// GET /api/events/:id
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id, {
    include: [
      { model: User, as: 'organizer', attributes: ['id', 'name', 'email'] },
      {
        model: Registration,
        as: 'registrations',
        where: { status: 'registered' },
        required: false,
        attributes: ['id'],
      },
    ],
  });

  if (!event) return res.status(404).json({ error: 'Event not found' });

  const seatsTaken = event.registrations.length;
  const spotsLeft = event.capacity ? Math.max(event.capacity - seatsTaken, 0) : null;

  res.json({
    ...event.toJSON(),
    seatsTaken,
    spotsLeft,
  });
});

// POST /api/events   (organizer only)
const createEvent = asyncHandler(async (req, res) => {
  const { title, description, location, dateTime, capacity } = req.body;

  if (!title || !location || !dateTime) {
    return res.status(400).json({ error: 'title, location and dateTime are required' });
  }

  const event = await Event.create({
    title,
    description,
    location,
    dateTime,
    capacity: capacity || null,
    organizerId: req.user.id,
  });

  res.status(201).json({ event });
});

// PUT /api/events/:id   (organizer who owns the event only)
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.organizerId !== req.user.id && req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'Only the organizer who created this event can edit it' });
  }
  if (event.organizerId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit events you organize' });
  }

  const { title, description, location, dateTime, capacity } = req.body;
  await event.update({
    title: title ?? event.title,
    description: description ?? event.description,
    location: location ?? event.location,
    dateTime: dateTime ?? event.dateTime,
    capacity: capacity ?? event.capacity,
  });

  res.json({ event });
});

// DELETE /api/events/:id   (organizer who owns the event only)
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.organizerId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete events you organize' });
  }

  await event.destroy();
  res.json({ message: 'Event deleted successfully' });
});

// GET /api/events/:id/registrations   (organizer who owns the event only — "admin panel" view)
const getEventRegistrations = asyncHandler(async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.organizerId !== req.user.id) {
    return res.status(403).json({ error: 'Only the organizer can view this event\'s registrations' });
  }

  const registrations = await Registration.findAll({
    where: { eventId: event.id },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'ASC']],
  });

  res.json({ event: event.title, count: registrations.length, registrations });
});

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
};
