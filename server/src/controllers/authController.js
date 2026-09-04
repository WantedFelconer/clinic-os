const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const MedicalReport = require('../models/MedicalReport');
const AuditLog = require('../models/AuditLog');
const { sendOTP, sendPasswordReset } = require('../utils/email');
const { getJwtConfig } = require('../config/security');

const OTP_EXPIRATION_MINUTES = parseInt(process.env.OTP_EXPIRATION_MINUTES, 10) || 10;
const OTP_EXPIRATION_MS = OTP_EXPIRATION_MINUTES * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_HOURLY_RESENDS = 5;

// In-memory tracker for OTP state (email -> { attempts, lockedUntil, lastSentAt, sendHistory })
const otpTrackerMap = new Map();

const getOtpTracker = (email) => {
  if (!otpTrackerMap.has(email)) {
    otpTrackerMap.set(email, {
      attempts: 0,
      lockedUntil: null,
      lastSentAt: 0,
      sendHistory: [],
    });
  }
  return otpTrackerMap.get(email);
};

const generateToken = (user) => {
  const config = getJwtConfig();
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.secret,
    { expiresIn: config.expiresIn, issuer: config.issuer, audience: config.audience, algorithm: 'HS256' }
  );
};

const generateSecureOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const authController = {
  async register(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const { password, role, first_name, last_name, phone } = req.body;

      // Restrict public registration to patient and doctor roles
      if (!['patient', 'doctor'].includes(role)) {
        return res.status(400).json({
          message: 'Public registration is permitted for patient and doctor roles. Staff and assistants must be onboarded through clinic invitation.',
        });
      }

      const existing = await User.findByEmail(email);
      if (existing && existing.is_verified) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const tracker = getOtpTracker(email);
      const now = Date.now();

      // Check hourly rate limit per email
      const recentSends = tracker.sendHistory.filter(t => now - t < 3600000);
      if (recentSends.length >= MAX_HOURLY_RESENDS) {
        return res.status(429).json({
          message: 'Too many verification code requests. Please try again in an hour.',
        });
      }

      // Check cooldown if re-registering an unverified account
      if (existing && !existing.is_verified && tracker.lastSentAt && now - tracker.lastSentAt < RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - (now - tracker.lastSentAt)) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingSec} second(s) before requesting another verification code.`,
        });
      }

      const otp = generateSecureOTP();
      const otpHash = await bcrypt.hash(otp, 10);
      const otpExpires = new Date(now + OTP_EXPIRATION_MS);

      // Attempt Brevo email delivery
      try {
        await sendOTP(email, otp, first_name || (existing ? existing.first_name : ''));
      } catch (err) {
        console.warn('[Email Delivery Warning] Failed to deliver verification code:', err.message);
        return res.status(500).json({
          message: "We couldn't send the verification email right now. Please try again shortly.",
        });
      }

      // Update or create user account
      if (existing && !existing.is_verified) {
        if (password) {
          await User.updatePassword(existing.id, password);
        }
        await User.updateOTP(email, otpHash, otpExpires);
      } else {
        await User.create({
          email,
          password,
          role,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone ? phone.trim() : null,
          verification_otp: otpHash,
          verification_otp_expires: otpExpires,
        });
      }

      // Update send tracker
      tracker.attempts = 0;
      tracker.lockedUntil = null;
      tracker.lastSentAt = now;
      tracker.sendHistory = [...recentSends, now];
      otpTrackerMap.set(email, tracker);

      res.status(existing ? 200 : 201).json({
        message: existing
          ? 'Registration pending verification. A new verification code has been sent to your email.'
          : 'Registration successful. Please check your email for the verification code.',
        email,
        dev_otp: process.env.NODE_ENV === 'test' ? otp : undefined,
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyOTP(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const otp = (req.body.otp || '').trim();

      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and verification code are required' });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'Verification code must be exactly 6 digits' });
      }

      const tracker = getOtpTracker(email);
      const now = Date.now();

      // Check brute force lockout
      if (tracker.lockedUntil && now < tracker.lockedUntil) {
        const remainingMinutes = Math.ceil((tracker.lockedUntil - now) / 60000);
        return res.status(429).json({
          message: `Too many failed attempts. Verification locked for ${remainingMinutes} minute(s). Please request a new code.`,
        });
      }

      const user = await User.findByEmailWithOTP(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.is_verified) {
        return res.status(400).json({ message: 'This email has already been verified.' });
      }
      if (!user.verification_otp || !user.verification_otp_expires) {
        return res.status(400).json({ message: 'No active verification code found. Please request a new one.' });
      }
      if (new Date() > new Date(user.verification_otp_expires)) {
        return res.status(400).json({ message: 'This verification code has expired. Please request a new one.' });
      }

      // Compare cryptographic bcrypt hash
      const isMatch = await bcrypt.compare(otp, user.verification_otp);
      if (!isMatch) {
        tracker.attempts += 1;
        if (tracker.attempts >= MAX_OTP_ATTEMPTS) {
          tracker.lockedUntil = now + 15 * 60 * 1000; // 15 minute lock
          otpTrackerMap.set(email, tracker);
          // Invalidate OTP in DB
          await User.updateOTP(email, null, null);
          return res.status(429).json({
            message: 'Too many incorrect attempts. The code has been invalidated. Please request a new code.',
          });
        }
        otpTrackerMap.set(email, tracker);
        return res.status(400).json({
          message: `Invalid verification code. ${MAX_OTP_ATTEMPTS - tracker.attempts} attempt(s) remaining.`,
        });
      }

      // Successful verification -> Invalidate OTP & reset attempt tracking
      await User.markEmailVerified(email);
      otpTrackerMap.delete(email);

      // Link any existing clinic patient records with this email to the verified user account
      if (user.role === 'patient') {
        const db = require('../config/database');
        await db.execute('UPDATE patients SET user_id = ? WHERE email = ? AND user_id IS NULL', [user.id, email]);
      }

      res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
      next(error);
    }
  },

  async resendOTP(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await User.findByEmailWithOTP(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.is_verified) {
        return res.status(400).json({ message: 'This email has already been verified.' });
      }

      const tracker = getOtpTracker(email);
      const now = Date.now();

      // Check 60-second cooldown
      if (tracker.lastSentAt && now - tracker.lastSentAt < RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - (now - tracker.lastSentAt)) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingSec} second(s) before requesting another code.`,
        });
      }

      // Check hourly send rate limit
      const recentSends = tracker.sendHistory.filter(t => now - t < 3600000);
      if (recentSends.length >= MAX_HOURLY_RESENDS) {
        return res.status(429).json({
          message: 'Too many verification requests. Please try again in an hour.',
        });
      }

      const otp = generateSecureOTP();
      const otpHash = await bcrypt.hash(otp, 10);
      const otpExpires = new Date(now + OTP_EXPIRATION_MS);

      // Attempt Brevo email delivery
      try {
        await sendOTP(email, otp, user.first_name);
      } catch (err) {
        console.warn('[Email Delivery Warning] Failed to deliver resend code:', err.message);
        return res.status(500).json({
          message: "We couldn't send the verification email right now. Please try again shortly.",
        });
      }

      // Persist OTP hash to database
      await User.updateOTP(email, otpHash, otpExpires);

      // Reset attempt locks and record send time
      tracker.attempts = 0;
      tracker.lockedUntil = null;
      tracker.lastSentAt = now;
      tracker.sendHistory = [...recentSends, now];
      otpTrackerMap.set(email, tracker);

      res.json({
        message: 'A new verification code has been sent to your email.',
        dev_otp: process.env.NODE_ENV === 'test' ? otp : undefined,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const { password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        await AuditLog.log({
          user_id: null,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: null,
          details: { email, reason: 'user_not_found' },
          ip_address: req.ip,
        });
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        await AuditLog.log({
          user_id: user.id,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: user.id,
          details: { email, reason: 'incorrect_password' },
          ip_address: req.ip,
        });
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.is_verified) {
        return res.status(403).json({ message: 'Please verify your email before logging in. Check your inbox for the verification code.' });
      }

      if (user.is_active === 0 || user.is_active === false) {
        await AuditLog.log({
          user_id: user.id,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: user.id,
          details: { email, reason: 'account_deactivated' },
          ip_address: req.ip,
        });
        return res.status(401).json({ message: 'Your account has been deactivated. Please contact platform administration.' });
      }

      const token = generateToken(user);

      await AuditLog.log({
        user_id: user.id,
        action: 'LOGIN',
        entity_type: 'user',
        entity_id: user.id,
        details: { email: user.email, role: user.role },
        ip_address: req.ip,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      // Explicitly prohibit modifying security and role fields
      if (req.body.role || req.body.is_verified !== undefined || req.body.is_active !== undefined || req.body.email || req.body.clinic_id) {
        return res.status(400).json({ message: 'Security violation: Role, email, and verification status cannot be changed through profile update.' });
      }

      const userUpdates = {};
      if (req.body.first_name !== undefined) userUpdates.first_name = req.body.first_name.trim();
      if (req.body.last_name !== undefined) userUpdates.last_name = req.body.last_name.trim();
      if (req.body.phone !== undefined) userUpdates.phone = req.body.phone;
      if (req.body.avatar_url !== undefined) userUpdates.avatar_url = req.body.avatar_url;

      let user = req.user;
      if (Object.keys(userUpdates).length > 0) {
        user = await User.update(req.user.id, userUpdates);
      }

      const patientFields = [
        'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
        'blood_group', 'allergies', 'chronic_conditions',
        'emergency_contact_name', 'emergency_contact_phone', 'address'
      ];
      const patientUpdates = {};
      for (const f of patientFields) {
        if (req.body[f] !== undefined) {
          patientUpdates[f] = req.body[f];
        }
      }

      const db = require('../config/database');
      if (req.user.role === 'patient' && Object.keys(patientUpdates).length > 0) {
        const profileFields = ['date_of_birth', 'gender', 'address', 'blood_group', 'allergies', 'chronic_conditions', 'emergency_contact_name', 'emergency_contact_phone'];
        const accountProfile = Object.fromEntries(profileFields.filter((field) => patientUpdates[field] !== undefined).map((field) => [field, patientUpdates[field] || null]));
        if (Object.keys(accountProfile).length > 0) {
          const columns = Object.keys(accountProfile);
          await db.execute(
            `INSERT INTO patient_profiles (user_id, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '?').join(', ')})
             ON DUPLICATE KEY UPDATE ${columns.map((column) => `${column} = VALUES(${column})`).join(', ')}, updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, ...columns.map((column) => accountProfile[column])]
          );
        }
      }
      const [existingPatients] = await db.execute(
        'SELECT id FROM patients WHERE user_id = ?',
        [req.user.id]
      );

      if (existingPatients.length > 0 && Object.keys(patientUpdates).length > 0) {
        for (const p of existingPatients) {
          await Patient.update(p.id, patientUpdates);
        }
      }

      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const user = await User.findByEmail(email);

      // Generic response to prevent user enumeration
      const genericMessage = 'If an account exists for this email, the recovery process has been initiated.';

      if (!user) {
        return res.json({ message: genericMessage });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await User.setResetToken(email, resetToken, resetExpires);
      await sendPasswordReset(email, resetToken, user.first_name).catch(err => console.warn('[Email Warning] Failed to send password reset email:', err.message));

      await AuditLog.log({
        user_id: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity_type: 'user',
        entity_id: user.id,
        details: { email },
        ip_address: req.ip,
      });

      res.json({ message: genericMessage, dev_token: process.env.NODE_ENV === 'test' ? resetToken : undefined });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const user = await User.findByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      await User.updatePassword(user.id, password);
      await User.clearResetToken(user.id);

      await AuditLog.log({
        user_id: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entity_type: 'user',
        entity_id: user.id,
        details: { email: user.email },
        ip_address: req.ip,
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  },

  async getNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Notification.findByUser(req.user.id, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async markNotificationRead(req, res, next) {
    try {
      const notification = await Notification.markAsRead(req.params.id, req.user.id);
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json({ notification });
    } catch (error) {
      next(error);
    }
  },

  async markAllNotificationsRead(req, res, next) {
    try {
      await Notification.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },

  async getPatientProfile(req, res, next) {
    try {
      const db = require('../config/database');
      const [patients] = await db.execute(
        `SELECT p.*, c.name as clinic_name, c.id as clinic_id
         FROM patients p
         LEFT JOIN clinics c ON p.clinic_id = c.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC`,
        [req.user.id]
      );
      const [profiles] = await db.execute('SELECT * FROM patient_profiles WHERE user_id = ?', [req.user.id]);
      const latestClinicPatient = patients[0] || {};
      const accountProfile = profiles[0] || {};
      res.json({ patient: {
        ...latestClinicPatient,
        ...accountProfile,
        id: latestClinicPatient.id,
        user_id: req.user.id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email,
        phone: req.user.phone,
        clinic_name: latestClinicPatient.clinic_name || null,
        clinic_id: latestClinicPatient.clinic_id,
      } });
    } catch (error) {
      next(error);
    }
  },

  async getMyAppointments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Appointment.findByUserId(req.user.id, page, 50);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyMedicalRecords(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await MedicalRecord.findByUserId(req.user.id, page, 50, false);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyPrescriptions(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Prescription.findByUserId(req.user.id, page, 50);
      for (const rx of result.prescriptions) {
        rx.items = await Prescription.getItems(rx.id);
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyPayments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Payment.findByUserId(req.user.id, page, 50);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyMedicalReports(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      res.json(await MedicalReport.findByUserId(req.user.id, page, 50));
    } catch (error) { next(error); }
  },
};

module.exports = authController;
