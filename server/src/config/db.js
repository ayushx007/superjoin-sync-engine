const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // Keep console clean
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for TiDB Cloud
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully.');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };