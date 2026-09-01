const crypto = require('crypto');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const Service = require('../models/Service');
const Package = require('../models/Package');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const paymentController = {
  async create(req, res, next) {
    try {
      const {
        patient_id,
        appointment_id,
        service_id,
        package_id,
        amount,
        discount,
        tax,
        payment_method,
        payment_status,
        notes,
      } = req.body;
      const clinicId = req.params.clinicId;

      if (!patient_id) {
        return res.status(400).json({ message: 'Patient selection is required to generate an invoice.' });
      }

      const patient = await Patient.findById(patient_id);
      if (!patient || patient.clinic_id !== clinicId) {
        return res.status(400).json({ message: 'Selected patient does not exist in this clinic.' });
      }

      // Base price resolution (Server is the source of truth)
      let basePrice = null;

      if (service_id) {
        const service = await Service.findById(service_id);
        if (!service || service.clinic_id !== clinicId) {
          return res.status(400).json({ message: 'Selected service does not belong to this clinic.' });
        }
        basePrice = parseFloat(service.price);
      } else if (package_id) {
        const pkg = await Package.findById(package_id);
        if (!pkg || pkg.clinic_id !== clinicId) {
          return res.status(400).json({ message: 'Selected package does not belong to this clinic.' });
        }
        basePrice = parseFloat(pkg.price);
      } else if (appointment_id) {
        const appt = await Appointment.findById(appointment_id);
        if (!appt || appt.clinic_id !== clinicId) {
          return res.status(400).json({ message: 'Selected appointment does not belong to this clinic.' });
        }
        if (appt.patient_id !== patient.id) {
          return res.status(400).json({ message: 'Selected appointment does not belong to this patient.' });
        }

        // Check for duplicate invoice for this appointment
        const existingInvoice = await Payment.findByAppointment(appointment_id);
        if (existingInvoice) {
          return res.status(400).json({
            message: `An active invoice (${existingInvoice.invoice_number}) already exists for this appointment.`,
          });
        }

        if (appt.service_id) {
          const apptService = await Service.findById(appt.service_id);
          if (apptService) basePrice = parseFloat(apptService.price);
        }
      }

      // If no catalog item determined the price, fall back to doctor/staff manual input
      if (basePrice === null || isNaN(basePrice)) {
        const manualAmount = parseFloat(amount);
        if (isNaN(manualAmount) || manualAmount <= 0) {
          return res.status(400).json({
            message: 'Base price could not be determined. Please specify a service, package, or valid positive amount.',
          });
        }
        basePrice = manualAmount;
      }

      // Discount & Tax validation
      const parsedDiscount = Math.max(0, parseFloat(discount || 0));
      if (parsedDiscount > basePrice) {
        return res.status(400).json({
          message: `Discount ($${parsedDiscount}) cannot exceed the base price ($${basePrice}).`,
        });
      }

      const parsedTax = Math.max(0, parseFloat(tax || 0));

      // Deterministic calculation: base - discount + tax
      const calculatedTotal = Math.max(
        0,
        Math.round((basePrice - parsedDiscount + parsedTax) * 100) / 100
      );

      const payment = await Payment.create({
        clinic_id: clinicId,
        patient_id,
        appointment_id: appointment_id || null,
        amount: basePrice,
        discount: parsedDiscount,
        tax: parsedTax,
        total_amount: calculatedTotal,
        payment_method: payment_method || 'cash',
        payment_status: payment_status || 'pending',
        notes: notes || null,
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PAYMENT_CREATED',
        entity_type: 'payment',
        entity_id: payment.id,
        details: {
          clinic_id: clinicId,
          patient_id,
          invoice_number: payment.invoice_number,
          base_price: basePrice,
          discount: parsedDiscount,
          tax: parsedTax,
          total_amount: payment.total_amount,
        },
        ip_address: req.ip,
      });

      if (patient.user_id) {
        await Notification.create({
          user_id: patient.user_id,
          title: 'Invoice Issued',
          message: `Invoice ${payment.invoice_number} for $${payment.total_amount} was issued.`,
          type: 'info',
          reference_type: 'payment',
          reference_id: payment.id,
        }).catch((err) => console.warn('[Notification Warning]:', err.message));
      }

      res.status(201).json({ message: 'Invoice generated successfully', payment });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment || payment.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Invoice / Payment not found in this clinic.' });
      }

      // If requested by a patient, verify ownership
      if (req.user && req.user.role === 'patient') {
        const patient = await Patient.findById(payment.patient_id);
        if (!patient || patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient payment record.' });
        }
      }

      res.json({ payment });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      if (req.user && req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view the clinic financial ledger.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const status = req.query.status || null;
      const result = await Payment.findByClinic(req.params.clinicId, page, limit, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyPayments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const db = require('../config/database');
      const [patients] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (patients.length === 0) return res.json({ payments: [], total: 0, page, limit: 20 });

      const result = await Payment.findByPatient(patients[0].id, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, transaction_id } = req.body;
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
      }

      const existing = await Payment.findById(req.params.id);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Payment record not found in this clinic.' });
      }

      // Patient validation: Patients can only pay their own pending invoice
      if (req.user && req.user.role === 'patient') {
        const patient = await Patient.findById(existing.patient_id);
        if (!patient || patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: Cannot pay or modify another patient invoice.' });
        }
        if (status !== 'completed') {
          return res.status(403).json({ message: 'Patients can only mark invoices as completed via simulated payment settlement.' });
        }
      }

      // Idempotency: Prevent duplicate payment settlement on already paid invoices
      if (existing.payment_status === 'completed' && status === 'completed') {
        return res.status(400).json({ message: 'Invoice has already been settled and marked as completed.' });
      }

      // Enforce strict payment state machine
      const allowedTransitions = {
        'pending': ['completed', 'failed'],
        'failed': ['pending'],       // retry allowed
        'completed': ['refunded'],   // refund only
        'refunded': [],              // terminal state
      };
      const allowed = allowedTransitions[existing.payment_status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Invalid payment transition: cannot change from '${existing.payment_status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none (terminal state)'}.`,
        });
      }

      // Simulated Transaction ID generation
      const simTxn = transaction_id || `SIM-TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const payment = await Payment.updateStatus(req.params.id, status, simTxn);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PAYMENT_STATUS_CHANGED',
        entity_type: 'payment',
        entity_id: req.params.id,
        details: {
          old_status: existing.payment_status,
          new_status: status,
          transaction_id: simTxn,
          invoice_number: payment.invoice_number,
          total_amount: payment.total_amount,
        },
        ip_address: req.ip,
      });

      // Notify patient on payment status change
      const patient = await Patient.findById(payment.patient_id);
      if (patient?.user_id) {
        await Notification.create({
          user_id: patient.user_id,
          title: status === 'completed' ? 'Simulated Payment Successful' : `Payment ${status.toUpperCase()}`,
          message: status === 'completed'
            ? `Your payment of $${payment.total_amount} for invoice ${payment.invoice_number} was completed successfully (Ref: ${simTxn}).`
            : `Invoice ${payment.invoice_number} payment status is now ${status}.`,
          type: status === 'completed' ? 'info' : (status === 'failed' ? 'warning' : 'info'),
          reference_type: 'payment',
          reference_id: payment.id,
        }).catch((err) => console.warn('[Notification Warning]:', err.message));
      }

      res.json({ message: `Payment marked as ${status}`, payment });
    } catch (error) {
      next(error);
    }
  },

  async getRevenue(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const revenue = await Payment.getRevenue(req.params.clinicId, start_date, end_date);
      res.json({ revenue });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = paymentController;
