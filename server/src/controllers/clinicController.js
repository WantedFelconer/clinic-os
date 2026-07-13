const Clinic = require('../models/Clinic');
const Service = require('../models/Service');
const Package = require('../models/Package');
const Patient = require('../models/Patient');
const User = require('../models/User');

const clinicController = {
  async create(req, res, next) {
    try {
      const clinic = await Clinic.create({ ...req.body, owner_id: req.user.id });
      await Clinic.addStaff(clinic.id, req.user.id, 'doctor');
      res.status(201).json({ message: 'Clinic created', clinic });
    } catch (error) {
      next(error);
    }
  },

  async getMyClinics(req, res, next) {
    try {
      const clinics = await Clinic.findByOwner(req.user.id);
      res.json({ clinics });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const clinic = await Clinic.findById(req.params.id);
      if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
      const staff = await Clinic.getStaff(req.params.id);
      const schedules = await Clinic.getSchedules(req.params.id);
      res.json({ clinic, staff, schedules });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const clinic = await Clinic.update(req.params.id, req.body);
      if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
      res.json({ message: 'Clinic updated', clinic });
    } catch (error) {
      next(error);
    }
  },

  async search(req, res, next) {
    try {
      const { query, city, specialization, page, limit } = req.query;
      const result = await Clinic.search({ query, city, specialization, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSchedules(req, res, next) {
    try {
      const schedules = await Clinic.getSchedules(req.params.clinicId);
      res.json({ schedules });
    } catch (error) {
      next(error);
    }
  },

  async updateSchedules(req, res, next) {
    try {
      const schedules = await Clinic.updateSchedules(req.params.clinicId, req.body.schedules);
      res.json({ message: 'Schedules updated', schedules });
    } catch (error) {
      next(error);
    }
  },

  async getStaff(req, res, next) {
    try {
      const staff = await Clinic.getStaff(req.params.clinicId);
      res.json({ staff });
    } catch (error) {
      next(error);
    }
  },

  async addStaff(req, res, next) {
    try {
      const { email, role } = req.body;
      const user = await User.findByEmail(email);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const result = await Clinic.addStaff(req.params.clinicId, user.id, role);
      res.status(201).json({ message: 'Staff added', staff: result });
    } catch (error) {
      next(error);
    }
  },

  async removeStaff(req, res, next) {
    try {
      await Clinic.removeStaff(req.params.clinicId, req.params.userId);
      res.json({ message: 'Staff removed' });
    } catch (error) {
      next(error);
    }
  },

  // Services
  async createService(req, res, next) {
    try {
      const service = await Service.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ service });
    } catch (error) {
      next(error);
    }
  },

  async getServices(req, res, next) {
    try {
      const services = await Service.findByClinic(req.params.clinicId);
      res.json({ services });
    } catch (error) {
      next(error);
    }
  },

  async updateService(req, res, next) {
    try {
      const service = await Service.update(req.params.serviceId, req.body);
      if (!service) return res.status(404).json({ message: 'Service not found' });
      res.json({ service });
    } catch (error) {
      next(error);
    }
  },

  async deleteService(req, res, next) {
    try {
      await Service.remove(req.params.serviceId);
      res.json({ message: 'Service deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Packages
  async createPackage(req, res, next) {
    try {
      const pkg = await Package.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ package: pkg });
    } catch (error) {
      next(error);
    }
  },

  async getPackages(req, res, next) {
    try {
      const packages = await Package.findByClinic(req.params.clinicId);
      res.json({ packages });
    } catch (error) {
      next(error);
    }
  },

  async updatePackage(req, res, next) {
    try {
      const pkg = await Package.update(req.params.packageId, req.body);
      if (!pkg) return res.status(404).json({ message: 'Package not found' });
      res.json({ package: pkg });
    } catch (error) {
      next(error);
    }
  },

  async deletePackage(req, res, next) {
    try {
      await Package.remove(req.params.packageId);
      res.json({ message: 'Package deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Dashboard
  async getDashboard(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const db = require('../config/database');

      const [apptCounts] = await db.execute(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM appointments WHERE clinic_id = ?`,
        [clinicId]
      );

      const [patientCount] = await db.execute(
        'SELECT COUNT(*) as total FROM patients WHERE clinic_id = ?', [clinicId]
      );

      const [revenue] = await db.execute(
        "SELECT IFNULL(SUM(total_amount), 0) as total FROM payments WHERE clinic_id = ? AND payment_status = 'completed'",
        [clinicId]
      );

      const [todayAppts] = await db.execute(
        `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
         FROM appointments a JOIN patients p ON a.patient_id = p.id
         WHERE a.clinic_id = ? AND a.appointment_date = CURDATE()
         ORDER BY a.start_time ASC`,
        [clinicId]
      );

      res.json({
        stats: {
          total_appointments: apptCounts[0].total,
          upcoming_appointments: apptCounts[0].upcoming,
          completed_appointments: apptCounts[0].completed,
          total_patients: patientCount[0].total,
          total_revenue: revenue[0].total,
        },
        today_appointments: todayAppts,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = clinicController;
