const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'events', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('registered', 'cancelled'),
    defaultValue: 'registered',
  },
}, {
  tableName: 'registrations',
  timestamps: true,
  indexes: [
    // A user can only have ONE active registration record per event
    // (re-registering after cancelling updates the same row).
    { unique: true, fields: ['userId', 'eventId'] },
  ],
});

module.exports = Registration;
