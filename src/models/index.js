const sequelize = require('../config/database');
const User = require('./User');
const Event = require('./Event');
const Registration = require('./Registration');

// ---- Associations ----

// A User (organizer) can create many Events
User.hasMany(Event, { foreignKey: 'organizerId', as: 'organizedEvents' });
Event.belongsTo(User, { foreignKey: 'organizerId', as: 'organizer' });

// A User can have many Registrations, a Registration belongs to one User
User.hasMany(Registration, { foreignKey: 'userId', as: 'registrations' });
Registration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// An Event can have many Registrations, a Registration belongs to one Event
Event.hasMany(Registration, { foreignKey: 'eventId', as: 'registrations' });
Registration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Many-to-many convenience: which events a user is registered for
User.belongsToMany(Event, {
  through: Registration,
  foreignKey: 'userId',
  otherKey: 'eventId',
  as: 'registeredEvents',
});
Event.belongsToMany(User, {
  through: Registration,
  foreignKey: 'eventId',
  otherKey: 'userId',
  as: 'attendees',
});

module.exports = { sequelize, User, Event, Registration };
