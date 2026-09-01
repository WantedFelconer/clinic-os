const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Production safety check: Ensure JWT_SECRET is configured
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('WARNING: A secure JWT_SECRET should be configured in production environment.');
}

const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === '1' ||
  (process.env.NODE_ENV === 'production' &&
    process.env.DB_HOST &&
    !['localhost', '127.0.0.1'].includes(process.env.DB_HOST));

const sslConfig = useSsl
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
  : undefined;

const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT, 10) || (process.env.VERCEL ? 10 : 20);

let mysqlPool;
if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  mysqlPool = mysql.createPool({
    uri,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(sslConfig ? { ssl: sslConfig } : {}),
  });
} else {
  const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'clinic_os',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(sslConfig ? { ssl: sslConfig } : {}),
  };
  mysqlPool = mysql.createPool(poolConfig);
}

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
