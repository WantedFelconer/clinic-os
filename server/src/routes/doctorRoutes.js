const router = require('express').Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { doctorValidator, paginationValidator } = require('../validators');

// Public endpoints
router.get('/search', paginationValidator, doctorController.search);
router.get('/:id', doctorController.getById);
router.get('/:id/reviews', paginationValidator, doctorController.getDoctorReviews);

// Protected doctor endpoints (FR-10)
router.get('/me/profile', authenticate, authorize('doctor'), doctorController.getMyProfile);
router.put('/me/profile', authenticate, authorize('doctor'), doctorValidator.updateProfile, doctorController.updateMyProfile);

module.exports = router;
