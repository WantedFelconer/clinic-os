const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Production safety check: Ensure JWT_SECRET is not missing or default in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'clinic-os-jwt-secret-key-change-in-production') {
    console.error('FATAL: A secure JWT_SECRET must be configured in production environment.');
    process.exit(1);
  }
}

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'clinic_os',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const mysqlPool = mysql.createPool(poolConfig);

const db = {
  /**
   * Execute a parameterized query (raw SQL query)
   */
  async query(sql, params) {
    return mysqlPool.query(sql, params);
  },

  /**
   * Execute a prepared SQL statement
   */
  async execute(sql, params) {
    return mysqlPool.execute(sql, params);
  },

  /**
   * Obtain a dedicated connection from the pool (for transactions)
   */
  async getConnection() {
    return mysqlPool.getConnection();
  },

  /**
   * Helper to execute queries inside an atomic transaction
   */
  async transaction(callback) {
    const connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Direct access to pool instance
   */
  pool: mysqlPool,
};

module.exports = db;
