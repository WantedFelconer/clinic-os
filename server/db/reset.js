const mysql = require('mysql2/promise');
const path = require('path');
const { migrate } = require('./migrate');
const { seed } = require('./seed');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function reset() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'clinic_os';

  console.log(`[Database Reset] Resetting database '${dbName}' on ${dbHost}:${dbPort}...`);

  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`Dropped database '${dbName}'.`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Recreated database '${dbName}'.`);
  } finally {
    await connection.end();
  }

  // Run migrations
  await migrate();

  // Run seeder
  await seed();

  console.log('[Database Reset] Database reset and initialization completed successfully.');
}

if (require.main === module) {
  reset().then(() => process.exit(0)).catch((err) => {
    console.error('Database reset failed:', err);
    process.exit(1);
  });
}

module.exports = { reset };
