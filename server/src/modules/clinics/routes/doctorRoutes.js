const router = require('express').Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize } = require('../../../core/middleware/rbac');
const doctorValidator = require('../validators/doctorValidator');
const { paginationValidator } = require('../../../core/validators');

// Public endpoints
router.get('/search', paginationValidator, doctorValidator.search, doctorController.search);
router.get('/:id', doctorController.getById);
router.get('/:id/reviews', paginationValidator, doctorController.getDoctorReviews);

// Protected doctor endpoints (FR-10)
router.get('/me/profile', authenticate, authorize('doctor'), doctorController.getMyProfile);
router.put('/me/profile', authenticate, authorize('doctor'), doctorValidator.updateProfile, doctorController.updateMyProfile);

module.exports = router;
