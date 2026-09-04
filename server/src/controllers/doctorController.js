const DoctorProfile = require('../models/DoctorProfile');
const Review = require('../models/Review');
const { publicDoctor } = require('../serializers/public');

const doctorController = {
  async search(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const query = req.query.query || req.query.search || '';
      const specialty = req.query.specialty || req.query.specialization || '';
      const city = req.query.city || '';
      const availabilityDate = req.query.availability_date || '';

      const result = await DoctorProfile.search({ query, specialty, city, availabilityDate, page, limit });
      res.json({ ...result, doctors: result.doctors.map(publicDoctor) });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const doctor = await DoctorProfile.getDoctorDetails(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      res.json({ doctor: publicDoctor(doctor) });
    } catch (error) {
      next(error);
    }
  },

  async getMyProfile(req, res, next) {
    try {
      const profile = await DoctorProfile.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  },

  async updateMyProfile(req, res, next) {
    try {
      const { qualifications, specialization, experience_years, consultation_fee, bio } = req.body;
      const profile = await DoctorProfile.update(req.user.id, {
        qualifications,
        specialization,
        experience_years,
        consultation_fee,
        bio,
      });
      res.json({ message: 'Doctor profile updated successfully', profile });
    } catch (error) {
      next(error);
    }
  },

  async getDoctorReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await Review.findByDoctor(req.params.id, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = doctorController;
