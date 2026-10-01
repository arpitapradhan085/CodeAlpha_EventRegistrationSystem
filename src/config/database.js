const { Sequelize } = require('sequelize');
require('dotenv').config();

// Using SQLite for zero-config local development.
// To switch to PostgreSQL/MySQL for production, replace the config below
// with { dialect: 'postgres', host, port, username, password, database }.
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: false,
});

module.exports = sequelize;
