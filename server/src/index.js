require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const fs = require('fs');
const https = require('https');
const { buildCorsOptions, createHttpsMiddleware, getJwtConfig, getTrustProxy, validateHttpsDeployment } = require('./config/security');

const authRoutes = require('./routes/authRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const medicalReportRoutes = require('./routes/medicalReportRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const internalRoutes = require('./routes/internalRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Fail fast before accepting traffic when authentication configuration is unsafe.
getJwtConfig();

const trustProxy = getTrustProxy();
if (trustProxy) app.set('trust proxy', trustProxy);
const httpsConfig = validateHttpsDeployment();

// Security
app.use(helmet({ hsts: false }));
app.use(createHttpsMiddleware(httpsConfig));

// Explicit CORS allowlist; production preview/custom origins must be configured.
app.use(cors(buildCorsOptions()));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/clinics/:clinicId/patients', patientRoutes);
app.use('/api/clinics/:clinicId/appointments', appointmentRoutes);
app.use('/api/clinics/:clinicId/medical-records', medicalRecordRoutes);
app.use('/api/clinics/:clinicId/medical-reports', medicalReportRoutes);
app.use('/api/clinics/:clinicId/prescriptions', prescriptionRoutes);
app.use('/api/clinics/:clinicId/payments', paymentRoutes);
app.use('/api/clinics/:clinicId/reviews', reviewRoutes);
app.use('/api/clinics/:clinicId/subscriptions', subscriptionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/internal', internalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

// Start server (only if not in test mode and not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const startServer = (port) => {
    const directTls = process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH;
    const server = directTls
      ? https.createServer({
          cert: fs.readFileSync(process.env.TLS_CERT_PATH),
          key: fs.readFileSync(process.env.TLS_KEY_PATH),
        }, app).listen(port, '0.0.0.0')
      : app.listen(port, '0.0.0.0');

    server.on('listening', () => console.log(`ClinicOS server listening on port ${port}${directTls ? ' with TLS' : ''}`));

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = Number(port) + 1;
        console.warn(`Port ${port} is currently in use. Trying port ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error('Server error:', err.message);
      }
    });

    const shutdown = (signal) => {
      console.log(`${signal} received; shutting down gracefully.`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  };

  startServer(PORT);
  require('./services/appointmentReminderService').startAppointmentReminderWorker();
}

module.exports = app;
