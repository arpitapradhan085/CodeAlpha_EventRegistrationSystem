const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventsRouter = require('./routes/events');
const registrationsRouter = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serves the simple frontend in /public

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Event Registration System' });
});

app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`Event Registration System running at http://localhost:${PORT}`);
});
