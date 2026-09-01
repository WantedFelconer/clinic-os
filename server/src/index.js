require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

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

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  const startServer = (port) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`ClinicOS server running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = Number(port) + 1;
        console.warn(`Port ${port} is currently in use. Trying port ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error('Server error:', err);
      }
    });
  };

  startServer(PORT);
}

module.exports = app;
