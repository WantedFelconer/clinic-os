const Review = require('../models/Review');

const reviewController = {
  async create(req, res, next) {
    try {
      const review = await Review.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ review });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'You have already reviewed this clinic' });
      }
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Review.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getPending(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Review.getPending(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async approve(req, res, next) {
    try {
      const review = await Review.approve(req.params.id);
      if (!review) return res.status(404).json({ message: 'Review not found' });
      res.json({ review });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await Review.remove(req.params.id);
      res.json({ message: 'Review removed' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reviewController;
