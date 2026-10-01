// Populates the database with a demo organizer, attendee, and event.
// Run with: npm run seed
require('dotenv').config();
const { sequelize, User, Event, Registration } = require('../models');

async function seed() {
  await sequelize.sync({ force: true }); // WARNING: wipes existing data
  console.log('Tables recreated.');

  const organizer = await User.create({
    name: 'Alex Organizer',
    email: 'organizer@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const attendee = await User.create({
    name: 'Sam Attendee',
    email: 'attendee@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const event = await Event.create({
    title: 'CodeAlpha Backend Dev Meetup',
    description: 'A meetup for backend developers to share projects and tips.',
    location: 'Community Hall, Main Street',
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    capacity: 50,
    organizerId: organizer.id,
  });

  await Registration.create({
    userId: attendee.id,
    eventId: event.id,
    status: 'registered',
  });

  console.log('Seed data created:');
  console.log(`  Organizer login -> email: ${organizer.email}  password: password123`);
  console.log(`  Attendee login  -> email: ${attendee.email}  password: password123`);
  console.log(`  Event: "${event.title}" (id: ${event.id})`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
