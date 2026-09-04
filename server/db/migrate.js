const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { sanitizeAuditDetails } = require('../src/utils/audit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'clinic_os';
  if (!/^[A-Za-z0-9_-]+$/.test(dbName)) {
    throw new Error('DB_NAME may contain only letters, numbers, underscores, and hyphens.');
  }

  const useSsl =
    process.env.DB_SSL === 'true' ||
    process.env.DB_SSL === '1' ||
    dbHost.includes('aivencloud.com') ||
    (process.env.NODE_ENV === 'production' && !['localhost', '127.0.0.1'].includes(dbHost));

  if (process.env.NODE_ENV === 'production' && useSsl && process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    throw new Error('DB_SSL_REJECT_UNAUTHORIZED=false is forbidden in production.');
  }
  const ssl = useSsl ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production' || process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ...(process.env.DB_SSL_CA_PATH ? { ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA_PATH), 'utf8') } : {}),
    ...(process.env.DB_SSL_CA_BASE64 ? { ca: Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') } : {}),
  } : undefined;

  // 1. Connect to MySQL server to ensure database exists
  let initialConnection;
  try {
    initialConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      ...(ssl ? { ssl } : {}),
    });

    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${dbName}' verified/created.`);
  } catch (err) {
    console.warn(`Note on initial connection / CREATE DATABASE: ${err.message}`);
  } finally {
    if (initialConnection) {
      await initialConnection.end();
    }
  }

  // 2. Connect to the specific database
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
    ...(ssl ? { ssl } : {}),
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

    const additiveMigrations = [
      "ALTER TABLE clinics ADD COLUMN timezone VARCHAR(100) NOT NULL DEFAULT 'UTC' AFTER country",
      'ALTER TABLE appointments ADD COLUMN reminder_sent_at DATETIME NULL AFTER cancellation_reason',
      'ALTER TABLE payments ADD COLUMN receipt_number VARCHAR(80) NULL UNIQUE AFTER payment_date',
      'ALTER TABLE payments ADD COLUMN receipt_generated_at DATETIME NULL AFTER receipt_number',
      'ALTER TABLE medical_reports ADD COLUMN uploaded_by VARCHAR(36) NULL AFTER doctor_id',
      'ALTER TABLE medical_reports ADD COLUMN title VARCHAR(255) NULL AFTER uploaded_by',
      'ALTER TABLE medical_reports ADD COLUMN file_name VARCHAR(255) NULL AFTER report_type',
    ];
    for (const statement of additiveMigrations) {
      try { await connection.query(statement); } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }
    await connection.query(
      `UPDATE medical_reports mr JOIN clinics c ON c.id = mr.clinic_id
       SET mr.uploaded_by = COALESCE(mr.uploaded_by, mr.doctor_id, c.owner_id),
           mr.title = COALESCE(mr.title, mr.report_type),
           mr.file_name = COALESCE(mr.file_name, 'legacy-report-reference')
       WHERE mr.uploaded_by IS NULL OR mr.title IS NULL OR mr.file_name IS NULL`
    );
    await connection.query('ALTER TABLE medical_reports MODIFY uploaded_by VARCHAR(36) NOT NULL, MODIFY title VARCHAR(255) NOT NULL, MODIFY file_name VARCHAR(255) NOT NULL');
    try {
      await connection.query('ALTER TABLE medical_reports ADD CONSTRAINT fk_medical_reports_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT');
    } catch (err) {
      if (!['ER_FK_DUP_NAME', 'ER_DUP_KEYNAME'].includes(err.code) && err.errno !== 1826) throw err;
    }

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
    await connection.query(
      `UPDATE audit_logs SET details = JSON_REMOVE(details,
       '$.diagnosis', '$.symptoms', '$.treatment', '$.treatment_plan', '$.notes',
       '$.allergies', '$.chronic_conditions', '$.updates.diagnosis', '$.updates.symptoms',
       '$.updates.treatment', '$.updates.treatment_plan', '$.updates.notes',
       '$.updates.allergies', '$.updates.chronic_conditions')
       WHERE details IS NOT NULL AND JSON_VALID(details)`
    );
    const [legacyAuditRows] = await connection.query('SELECT id, details FROM audit_logs WHERE details IS NOT NULL');
    for (const row of legacyAuditRows) {
      let details = row.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = {}; }
      }
      await connection.query('UPDATE audit_logs SET details = ? WHERE id = ?', [JSON.stringify(sanitizeAuditDetails(details)), row.id]);
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
