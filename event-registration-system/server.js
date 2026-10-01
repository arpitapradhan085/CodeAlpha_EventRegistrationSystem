const express = require('express');
const cors = require('cors');

const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root route - quick API overview
app.get('/', (req, res) => {
  res.json({
    message: 'Event Registration System API',
    endpoints: {
      events: {
        'POST /api/events': 'Create a new event',
        'GET /api/events': 'List all events',
        'GET /api/events/:id': 'Get event details + attendees',
        'PUT /api/events/:id': 'Update an event',
        'DELETE /api/events/:id': 'Delete an event'
      },
      registrations: {
        'POST /api/registrations': 'Register for an event (body: event_id, name, email)',
        'GET /api/registrations/user/:email': 'View a user\'s registrations',
        'GET /api/registrations/event/:eventId': 'View all registrations for an event',
        'DELETE /api/registrations/:id': 'Cancel a registration'
      }
    }
  });
});

app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Event Registration System API running on http://localhost:${PORT}`);
});
