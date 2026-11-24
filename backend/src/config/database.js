const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL when available (e.g. Supabase), otherwise use individual env vars
const useDatabaseUrl = !!process.env.DATABASE_URL;

const sequelize = useDatabaseUrl
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false, // Set to console.log to see SQL queries
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Required for Supabase
        }
      },
      pool: {
        max: 5,          // Maximum number of connections
        min: 0,          // Minimum number of connections
        acquire: 30000,  // Maximum time to wait for connection (ms)
        idle: 10000      // Maximum time connection can be idle (ms)
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
        pool: {
          max: 5,          // Maximum number of connections
          min: 0,          // Minimum number of connections
          acquire: 30000,  // Maximum time to wait for connection (ms)
          idle: 10000      // Maximum time connection can be idle (ms)
        },
        define: {
          timestamps: true,        // Automatically add createdAt and updatedAt
          underscored: false,      // Use camelCase instead of snake_case
          freezeTableName: false   // Use plural table names
        }
      }
    );

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    if (useDatabaseUrl) {
      console.log('✓ Connected to Supabase PostgreSQL');
    }
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);

    if (useDatabaseUrl) {
      // Helpful error messages for DATABASE_URL connections
      if (error.message && error.message.includes('password authentication failed')) {
        console.error('\nTip: Check your DATABASE_URL password is correct');
      }
      if (error.message && error.message.includes('no pg_hba.conf entry')) {
        console.error('\nTip: Make sure SSL is enabled in dialectOptions');
      }
    }

    return false;
  }
};

module.exports = { sequelize, testConnection };