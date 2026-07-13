const router = require('express').Router();
const clinicController = require('../controllers/clinicController');
const { authenticate } = require('../middleware/auth');
const { authorize, clinicAccess } = require('../middleware/rbac');

// Public
router.get('/search', clinicController.search);
router.get('/:id', clinicController.getById);
router.get('/:id/schedules', clinicController.getSchedules);

// Protected - Doctor
router.post('/', authenticate, authorize('doctor'), clinicController.create);
router.get('/', authenticate, authorize('doctor', 'assistant'), clinicController.getMyClinics);
router.put('/:id', authenticate, authorize('doctor'), clinicController.update);
router.put('/:clinicId/schedules', authenticate, authorize('doctor'), clinicController.updateSchedules);

// Staff management
router.get('/:clinicId/staff', authenticate, clinicAccess, clinicController.getStaff);
router.post('/:clinicId/staff', authenticate, authorize('doctor'), clinicController.addStaff);
router.delete('/:clinicId/staff/:userId', authenticate, authorize('doctor'), clinicController.removeStaff);

// Dashboard
router.get('/:clinicId/dashboard', authenticate, clinicAccess, clinicController.getDashboard);

// Services
router.get('/:clinicId/services', clinicController.getServices);
router.post('/:clinicId/services', authenticate, authorize('doctor'), clinicController.createService);
router.put('/:clinicId/services/:serviceId', authenticate, authorize('doctor'), clinicController.updateService);
router.delete('/:clinicId/services/:serviceId', authenticate, authorize('doctor'), clinicController.deleteService);

// Packages
router.get('/:clinicId/packages', clinicController.getPackages);
router.post('/:clinicId/packages', authenticate, authorize('doctor'), clinicController.createPackage);
router.put('/:clinicId/packages/:packageId', authenticate, authorize('doctor'), clinicController.updatePackage);
router.delete('/:clinicId/packages/:packageId', authenticate, authorize('doctor'), clinicController.deletePackage);

module.exports = router;
