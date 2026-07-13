const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const authController = {
  async register(req, res, next) {
    try {
      const { email, password, role, first_name, last_name, phone } = req.body;

      if (!['patient', 'doctor'].includes(role)) {
        return res.status(400).json({ message: 'Role must be patient or doctor' });
      }

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const user = await User.create({ email, password, role, first_name, last_name, phone });
      const token = generateToken(user);

      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        token,
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.is_verified) {
        return res.status(403).json({ message: 'Please verify your email before logging in' });
      }

      const token = generateToken(user);

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
      const { first_name, last_name, phone } = req.body;
      const user = await User.update(req.user.id, { first_name, last_name, phone });
      res.json({ message: 'Profile updated', user });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'No account with that email' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000);

      await User.setResetToken(email, resetToken, resetExpires);

      // In production, send email with reset link
      res.json({ message: 'Password reset email sent', resetToken });
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

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  },

  async getNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
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
};

module.exports = authController;
