/**
 * ClinicOS Email Service - Brevo Transactional Email Provider
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * Header: api-key: ${BREVO_API_KEY}
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sanitize and escape string to prevent HTML injection in emails
 */
const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Core sendEmail helper targeting Brevo Transactional API
 */
const sendEmail = async ({ to, toName, subject, html }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').replace(/^["']|["']$/g, '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'ClinicOS').replace(/^["']|["']$/g, '').trim();

  // If in test environment or Brevo API key is not configured, use safe dev/mock fallback
  if (process.env.NODE_ENV === 'test' || !apiKey || !senderEmail) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  [Brevo Email Dev Fallback - API Key / Sender not set]');
      console.log(`  To: ${to} ${toName ? `(${toName})` : ''}`);
      console.log(`  Subject: ${subject}`);
      console.log('───────────────────────────────────────────────────────────');
      console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      console.log('═══════════════════════════════════════════════════════════\n');
    }
    return { success: true, messageId: 'mock-dev-delivery-id' };
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: to,
        ...(toName ? { name: toName } : {}),
      },
    ],
    subject,
    htmlContent: html,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // Not JSON
      }

      // Safe logging: Never log API key or authorization headers
      console.warn(
        `[Brevo Warning] Failed to send email (HTTP ${response.status}):`,
        errorJson?.message || response.statusText || 'Delivery rejected'
      );

      const err = new Error(errorJson?.message || `Brevo email delivery failed with status ${response.status}`);
      err.statusCode = response.status;
      throw err;
    }

    const data = await response.json();
    return { success: true, messageId: data?.messageId };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Brevo Warning] Email request timed out after 10 seconds');
      throw new Error('Email service request timed out');
    }
    // Re-throw so caller knows email delivery failed
    throw err;
  }
};

/**
 * Send OTP Verification Code
 */
const sendOTP = (email, otp, firstName) => {
  const safeName = escapeHtml(firstName) || 'there';
  const expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES, 10) || 10;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-size: 22px; font-weight: bold; line-height: 48px; text-align: center;">C</div>
          <h2 style="font-size: 16px; font-weight: 700; color: #2563eb; margin: 8px 0 0 0; letter-spacing: 0.5px;">ClinicOS</h2>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">Verify your email</h1>
        
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${safeName}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">Welcome to ClinicOS. Please use the following 6-digit verification code to complete your registration:</p>
        
        <!-- OTP Box -->
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #2563eb; background: #eff6ff; padding: 14px 28px; border-radius: 12px; border: 1px solid #bfdbfe; font-family: monospace;">
            ${otp}
          </div>
        </div>
        
        <p style="font-size: 13px; color: #64748b; text-align: center; margin: 0 0 24px 0;">This code expires in <strong>${expirationMinutes} minutes</strong>.</p>
        
        <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
          <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
            🔒 <strong>Security Tip:</strong> Never share this code with anyone. ClinicOS representatives will never ask for your verification code.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
          If you did not create a ClinicOS account, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} ClinicOS. Security-focused clinical operating system.
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, toName: firstName, subject: 'Your ClinicOS Verification Code', html });
};

/**
 * Send Password Reset Link
 */
const sendPasswordReset = (email, token, firstName) => {
  const safeName = escapeHtml(firstName) || 'there';
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-size: 22px; font-weight: bold; line-height: 48px; text-align: center;">C</div>
          <h2 style="font-size: 16px; font-weight: 700; color: #2563eb; margin: 8px 0 0 0; letter-spacing: 0.5px;">ClinicOS</h2>
        </div>

        <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">Reset your password</h1>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${safeName}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">We received a request to reset your password for ClinicOS. Click the button below to set a new password. This link expires in 1 hour.</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset Password</a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; text-align: center; margin: 0 0 16px 0;">Or copy and paste this link in your browser:<br/><span style="color: #2563eb; font-size: 12px; word-break: break-all;">${resetUrl}</span></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, toName: firstName, subject: 'Reset your ClinicOS password', html });
};

/**
 * Send Appointment Booking Notification
 */
const sendAppointmentBookingNotification = ({ to, patientName, clinicName, doctorName, date, time }) => {
  const safePatient = escapeHtml(patientName) || 'Patient';
  const safeClinic = escapeHtml(clinicName) || 'Clinic';
  const safeDoctor = escapeHtml(doctorName);
  const safeDate = escapeHtml(date);
  const safeTime = escapeHtml(time);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Appointment Confirmed</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Appointment Confirmed</h2>
        <p style="color: #475569;">Hi <strong>${safePatient}</strong>,</p>
        <p style="color: #475569;">Your appointment has been successfully scheduled:</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #334155;"><strong>Clinic:</strong> ${safeClinic}</p>
          ${safeDoctor ? `<p style="margin: 4px 0; color: #334155;"><strong>Doctor:</strong> ${safeDoctor}</p>` : ''}
          <p style="margin: 4px 0; color: #334155;"><strong>Date:</strong> ${safeDate}</p>
          <p style="margin: 4px 0; color: #334155;"><strong>Time:</strong> ${safeTime}</p>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">Please arrive 10 minutes prior to your scheduled consultation time.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, toName: patientName, subject: `Appointment Scheduled at ${safeClinic}`, html });
};

/**
 * Send Appointment Status Notification
 */
const sendAppointmentStatusNotification = ({ to, patientName, clinicName, status, date, reason }) => {
  const safePatient = escapeHtml(patientName) || 'Patient';
  const safeClinic = escapeHtml(clinicName) || 'Clinic';
  const safeStatus = escapeHtml(status);
  const safeDate = escapeHtml(date);
  const safeReason = escapeHtml(reason);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Appointment Status Update</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Appointment Status Update</h2>
        <p style="color: #475569;">Hi <strong>${safePatient}</strong>,</p>
        <p style="color: #475569;">Your appointment scheduled for <strong>${safeDate}</strong> at <strong>${safeClinic}</strong> status has changed to: <span style="font-weight:bold; text-transform: capitalize;">${safeStatus}</span>.</p>
        ${safeReason ? `<p style="color: #dc2626;"><strong>Note:</strong> ${safeReason}</p>` : ''}
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, toName: patientName, subject: `Appointment Status Updated: ${safeStatus}`, html });
};

/**
 * Send Appointment Reschedule Notification
 */
const sendAppointmentRescheduleNotification = ({ to, patientName, clinicName, newDate, newTime }) => {
  const safePatient = escapeHtml(patientName) || 'Patient';
  const safeClinic = escapeHtml(clinicName) || 'Clinic';
  const safeDate = escapeHtml(newDate);
  const safeTime = escapeHtml(newTime);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Appointment Rescheduled</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Appointment Rescheduled</h2>
        <p style="color: #475569;">Hi <strong>${safePatient}</strong>,</p>
        <p style="color: #475569;">Your appointment at <strong>${safeClinic}</strong> has been rescheduled:</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #334155;"><strong>New Date:</strong> ${safeDate}</p>
          <p style="margin: 4px 0; color: #334155;"><strong>New Time:</strong> ${safeTime}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, toName: patientName, subject: `Appointment Rescheduled at ${safeClinic}`, html });
};

module.exports = {
  sendEmail,
  sendOTP,
  sendPasswordReset,
  sendAppointmentBookingNotification,
  sendAppointmentStatusNotification,
  sendAppointmentRescheduleNotification,
};
