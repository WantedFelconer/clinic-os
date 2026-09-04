const db = require('../../../core/config/database');
const { generateUUID } = require('../../../core/utils/helpers');
const Notification = require('../models/Notification');

const messageController = {
  async getRecipients(req, res, next) {
    try {
      let recipients = [];
      if (req.user.role === 'patient') {
        [recipients] = await db.execute(
          `SELECT DISTINCT recipient.id, recipient.first_name, recipient.last_name, recipient.role
           FROM (
             SELECT u.id, u.first_name, u.last_name, u.role
             FROM patients p JOIN clinics c ON c.id = p.clinic_id AND c.is_active = 1
             JOIN users u ON u.id = c.owner_id AND u.is_active = 1
             WHERE p.user_id = ? AND p.is_active = 1
             UNION
             SELECT u.id, u.first_name, u.last_name, u.role
             FROM patients p JOIN clinics c ON c.id = p.clinic_id AND c.is_active = 1
             JOIN clinic_staff cs ON cs.clinic_id = c.id AND cs.is_active = 1
             JOIN users u ON u.id = cs.user_id AND u.is_active = 1
             WHERE p.user_id = ? AND p.is_active = 1
           ) recipient
           ORDER BY recipient.first_name, recipient.last_name`,
          [req.user.id, req.user.id]
        );
      } else if (['doctor', 'assistant'].includes(req.user.role)) {
        [recipients] = await db.execute(
          `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role
           FROM patients p
           JOIN clinics c ON c.id = p.clinic_id AND c.is_active = 1
           LEFT JOIN clinic_staff cs ON cs.clinic_id = c.id AND cs.user_id = ? AND cs.is_active = 1
           JOIN users u ON u.id = p.user_id AND u.is_active = 1
           WHERE p.is_active = 1 AND (c.owner_id = ? OR cs.id IS NOT NULL)
           ORDER BY u.first_name, u.last_name`,
          [req.user.id, req.user.id]
        );
      }
      res.json({ recipients });
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req, res, next) {
    try {
      const { receiver_id, subject, message, content } = req.body;
      const msgText = message || content;
      if (!receiver_id || !msgText) {
        return res.status(400).json({ message: 'Receiver ID and message content are required' });
      }

      if (req.body.sender_id && req.body.sender_id !== req.user.id) {
        return res.status(403).json({ message: 'Sender identity must match the authenticated account.' });
      }

      if (receiver_id === req.user.id) {
        return res.status(400).json({ message: 'Cannot send a message to yourself' });
      }

      // Verify receiver exists
      const [receiverRows] = await db.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [receiver_id]
      );
      if (receiverRows.length === 0) {
        return res.status(404).json({ message: 'Receiver not found' });
      }

      // Admins can message anyone
      if (req.user.role !== 'admin') {
        // Validate legitimate communication relationship
        // A patient can message a doctor they have a clinical relationship with (via shared clinic)
        // A doctor/assistant can message patients at their clinic
        const hasRelationship = await validateMessagingRelationship(req.user.id, req.user.role, receiver_id, receiverRows[0].role);
        if (!hasRelationship) {
          return res.status(403).json({
            message: 'You can only message users you have a clinical relationship with (e.g., your doctor or your patient at a shared clinic).'
          });
        }
      }

      const id = generateUUID();

      await db.execute(
        `INSERT INTO messages (id, sender_id, receiver_id, subject, message, is_read)
         VALUES (?, ?, ?, ?, ?, false)`,
        [id, req.user.id, receiver_id, subject || 'General Query', msgText]
      );

      const [rows] = await db.execute(
        `SELECT m.*, 
                u1.first_name as sender_first_name, u1.last_name as sender_last_name,
                u2.first_name as receiver_first_name, u2.last_name as receiver_last_name
         FROM messages m
         JOIN users u1 ON m.sender_id = u1.id
         JOIN users u2 ON m.receiver_id = u2.id
         WHERE m.id = ?`,
        [id]
      );

      const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Someone';
      await Notification.create({
        user_id: receiver_id,
        title: `New Message from ${senderName}`,
        message: 'You received a new secure message. Sign in to ClinicOS to read it.',
        type: 'info',
        reference_type: 'message',
        reference_id: id,
      });

      res.status(201).json({ message: rows[0] });
    } catch (error) {
      next(error);
    }
  },

  async getMyMessages(req, res, next) {
    try {
      const [messages] = await db.execute(
        `SELECT m.*, 
                u1.first_name as sender_first_name, u1.last_name as sender_last_name,
                u2.first_name as receiver_first_name, u2.last_name as receiver_last_name
         FROM messages m
         JOIN users u1 ON m.sender_id = u1.id
         JOIN users u2 ON m.receiver_id = u2.id
         WHERE m.sender_id = ? OR m.receiver_id = ?
         ORDER BY m.created_at DESC`,
        [req.user.id, req.user.id]
      );

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req, res, next) {
    try {
      await db.execute(
        'UPDATE messages SET is_read = true WHERE id = ? AND receiver_id = ?',
        [req.params.id, req.user.id]
      );
      res.json({ message: 'Message marked as read' });
    } catch (error) {
      next(error);
    }
  },
};

/**
 * Validates that sender and receiver have a legitimate clinical relationship
 * through a shared clinic (via clinic_staff, patients, or appointments).
 */
async function validateMessagingRelationship(senderId, senderRole, receiverId, receiverRole) {
  // Patient ↔ Doctor/Assistant: Must share a clinic (patient is registered at a clinic where the other is staff)
  if (senderRole === 'patient') {
    // Patient can message doctors/assistants at clinics where they are a patient
    const [rows] = await db.execute(
      `SELECT 1 FROM patients p
       JOIN clinic_staff cs ON p.clinic_id = cs.clinic_id AND cs.is_active = 1
       WHERE p.user_id = ? AND cs.user_id = ?
       LIMIT 1`,
      [senderId, receiverId]
    );
    if (rows.length > 0) return true;

    // Also check clinic ownership (doctor may be owner, not in clinic_staff)
    const [ownerRows] = await db.execute(
      `SELECT 1 FROM patients p
       JOIN clinics c ON p.clinic_id = c.id
       WHERE p.user_id = ? AND c.owner_id = ?
       LIMIT 1`,
      [senderId, receiverId]
    );
    return ownerRows.length > 0;
  }

  if (senderRole === 'doctor' || senderRole === 'assistant') {
    // Doctor/Assistant can message patients at their clinics
    if (receiverRole === 'patient') {
      const [rows] = await db.execute(
        `SELECT 1 FROM clinic_staff cs
         JOIN patients p ON cs.clinic_id = p.clinic_id
         WHERE cs.user_id = ? AND cs.is_active = 1 AND p.user_id = ?
         LIMIT 1`,
        [senderId, receiverId]
      );
      if (rows.length > 0) return true;

      // Also check via clinic ownership
      const [ownerRows] = await db.execute(
        `SELECT 1 FROM clinics c
         JOIN patients p ON c.id = p.clinic_id
         WHERE c.owner_id = ? AND p.user_id = ?
         LIMIT 1`,
        [senderId, receiverId]
      );
      return ownerRows.length > 0;
    }

    // Doctor/Assistant can message other staff at same clinic
    const [rows] = await db.execute(
      `SELECT 1 FROM clinic_staff cs1
       JOIN clinic_staff cs2 ON cs1.clinic_id = cs2.clinic_id
       WHERE cs1.user_id = ? AND cs2.user_id = ? AND cs1.is_active = 1 AND cs2.is_active = 1
       LIMIT 1`,
      [senderId, receiverId]
    );
    return rows.length > 0;
  }

  return false;
}

module.exports = messageController;
