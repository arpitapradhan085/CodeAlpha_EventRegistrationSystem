const express = require('express');
const router = express.Router();
const db = require('../db/database');

// CREATE an event
router.post('/', (req, res) => {
  const { title, description, location, event_date, capacity } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'title and event_date are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO events (title, description, location, event_date, capacity)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title, description || '', location || '', event_date, capacity || 0);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(event);
});

// LIST all events (with number of confirmed registrations + spots left)
router.get('/', (req, res) => {
  const events = db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS registered_count
    FROM events e
    ORDER BY e.event_date ASC
  `).all();

  const withAvailability = events.map(e => ({
    ...e,
    spots_left: e.capacity > 0 ? Math.max(e.capacity - e.registered_count, 0) : null
  }));

  res.json(withAvailability);
});

// GET single event details
router.get('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const registered_count = db.prepare(`
    SELECT COUNT(*) AS count FROM registrations WHERE event_id = ? AND status = 'confirmed'
  `).get(req.params.id).count;

  const attendees = db.prepare(`
    SELECT u.id, u.name, u.email, r.registered_at
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    WHERE r.event_id = ? AND r.status = 'confirmed'
    ORDER BY r.registered_at ASC
  `).all(req.params.id);

  res.json({
    ...event,
    registered_count,
    spots_left: event.capacity > 0 ? Math.max(event.capacity - registered_count, 0) : null,
    attendees
  });
});

// UPDATE an event
router.put('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { title, description, location, event_date, capacity } = req.body;

  db.prepare(`
    UPDATE events SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      location = COALESCE(?, location),
      event_date = COALESCE(?, event_date),
      capacity = COALESCE(?, capacity)
    WHERE id = ?
  `).run(title, description, location, event_date, capacity, req.params.id);

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE an event
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Event not found' });
  res.json({ message: 'Event deleted successfully' });
});

module.exports = router;
