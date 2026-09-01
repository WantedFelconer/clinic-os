const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'clinic_os';

  // 1. Connect to MySQL server to ensure database exists
  const initialConnection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
  });

  try {
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${dbName}' verified/created.`);
  } finally {
    await initialConnection.end();
  }

  // 2. Connect to the specific database
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
  });

  try {
    const rawSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Remove SQL line comments
    const cleanSql = rawSql
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('--')) return '';
        return line;
      })
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const tableStatements = [];
    const indexStatements = [];

    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('CREATE INDEX')) {
        indexStatements.push(stmt);
      } else {
        tableStatements.push(stmt);
      }
    }

    // 1. Execute table creation statements
    for (const tableSql of tableStatements) {
      if (tableSql.trim()) {
        await connection.query(tableSql);
      }
    }
    console.log('Tables created/verified successfully.');

    // 2. Execute index creation statements
    for (const indexSql of indexStatements) {
      if (indexSql.trim()) {
        try {
          await connection.query(indexSql);
        } catch (err) {
          if (err.message.includes('Duplicate key name') || err.message.includes('already exists')) {
            // Index already exists — benign
          } else {
            console.warn(`Index note [${indexSql.substring(0, 40)}...]:`, err.message);
          }
        }
      }
    }
    // 3. Schema alterations for existing databases
    try {
      await connection.query('ALTER TABLE users MODIFY COLUMN verification_otp VARCHAR(255) DEFAULT NULL');
    } catch (err) {
      // Ignore if already modified or table doesn't exist yet
    }

    console.log('Indexes created/verified successfully.');
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrate };
