const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Helper: find or create a user by email
function findOrCreateUser(name, email) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  return user;
}

// SUBMIT a registration form for an event
router.post('/', (req, res) => {
  const { event_id, name, email } = req.body;

  if (!event_id || !name || !email) {
    return res.status(400).json({ error: 'event_id, name and email are required' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Check capacity
  if (event.capacity > 0) {
    const count = db.prepare(`
      SELECT COUNT(*) AS c FROM registrations WHERE event_id = ? AND status = 'confirmed'
    `).get(event_id).c;
    if (count >= event.capacity) {
      return res.status(400).json({ error: 'Event is full' });
    }
  }

  const user = findOrCreateUser(name, email);

  // Check for an existing (possibly cancelled) registration
  const existing = db.prepare(`
    SELECT * FROM registrations WHERE event_id = ? AND user_id = ?
  `).get(event_id, user.id);

  let registration;
  if (existing) {
    if (existing.status === 'confirmed') {
      return res.status(409).json({ error: 'User already registered for this event' });
    }
    db.prepare(`UPDATE registrations SET status = 'confirmed', registered_at = datetime('now') WHERE id = ?`)
      .run(existing.id);
    registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(existing.id);
  } else {
    const result = db.prepare(`
      INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, 'confirmed')
    `).run(event_id, user.id);
    registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);
  }

  res.status(201).json({ ...registration, user });
});

// VIEW all registrations for a specific user (by email)
router.get('/user/:email', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const registrations = db.prepare(`
    SELECT r.id AS registration_id, r.status, r.registered_at, e.*
    FROM registrations r
    JOIN events e ON e.id = r.event_id
    WHERE r.user_id = ?
    ORDER BY e.event_date ASC
  `).all(user.id);

  res.json(registrations);
});

// VIEW all registrations for a specific event
router.get('/event/:eventId', (req, res) => {
  const registrations = db.prepare(`
    SELECT r.id AS registration_id, r.status, r.registered_at, u.name, u.email
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    WHERE r.event_id = ?
    ORDER BY r.registered_at ASC
  `).all(req.params.eventId);

  res.json(registrations);
});

// CANCEL a registration
router.delete('/:id', (req, res) => {
  const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!registration) return res.status(404).json({ error: 'Registration not found' });

  db.prepare(`UPDATE registrations SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Registration cancelled successfully' });
});

module.exports = router;
