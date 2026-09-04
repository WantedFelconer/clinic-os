const router = require('express').Router();
const clinicController = require('../controllers/clinicController');
const { authenticate } = require('../../../core/middleware/auth');
const { authorize, clinicAccess, requireClinicOwner } = require('../../../core/middleware/rbac');
const { requireFeature } = require('../../../core/middleware/subscription');
const clinicValidator = require('../validators/clinicValidator');
const { paginationValidator, commonValidator } = require('../../../core/validators');

// Public
router.get('/search', paginationValidator, clinicValidator.search, clinicController.search);
router.get('/:id', clinicController.getById);
router.get('/:id/schedules', clinicController.getSchedules);
router.get('/:clinicId/available-slots', clinicValidator.availableSlots, clinicController.getAvailableSlots);

// Protected - Doctor / Clinic management
router.post('/', authenticate, authorize('doctor'), clinicValidator.create, clinicController.create);
router.get('/', authenticate, authorize('doctor', 'assistant'), clinicController.getMyClinics);
router.put('/:id', authenticate, clinicAccess, requireClinicOwner, clinicValidator.update, clinicController.update);
router.patch('/:id/branding', authenticate, clinicAccess, requireClinicOwner, requireFeature('custom_branding'), clinicValidator.branding, clinicController.updateBranding);
router.put('/:clinicId/schedules', authenticate, clinicAccess, requireClinicOwner, commonValidator.schedules, clinicController.updateSchedules);

// Staff management (Restricted to Clinic Owner or Platform Admin)
router.get('/:clinicId/staff', authenticate, clinicAccess, clinicController.getStaff);
router.post('/:clinicId/staff', authenticate, clinicAccess, requireClinicOwner, requireFeature('staff_management'), clinicValidator.addStaff, clinicController.addStaff);
router.delete('/:clinicId/staff/:userId', authenticate, clinicAccess, requireClinicOwner, requireFeature('staff_management'), clinicController.removeStaff);

// Dashboard & Analytics
router.get('/:clinicId/dashboard', authenticate, clinicAccess, clinicController.getDashboard);
router.get('/:clinicId/analytics', authenticate, clinicAccess, requireFeature('analytics'), clinicController.getAnalytics);

// Services
router.get('/:clinicId/services', clinicController.getServices);
router.post('/:clinicId/services', authenticate, clinicAccess, authorize('doctor'), clinicValidator.service, clinicController.createService);
router.put('/:clinicId/services/:serviceId', authenticate, clinicAccess, authorize('doctor'), clinicValidator.service, clinicController.updateService);
router.delete('/:clinicId/services/:serviceId', authenticate, clinicAccess, authorize('doctor'), clinicController.deleteService);

// Packages
router.get('/:clinicId/packages', clinicController.getPackages);
router.post('/:clinicId/packages', authenticate, clinicAccess, authorize('doctor'), requireFeature('packages'), clinicValidator.package, clinicController.createPackage);
router.put('/:clinicId/packages/:packageId', authenticate, clinicAccess, authorize('doctor'), requireFeature('packages'), clinicValidator.package, clinicController.updatePackage);
router.delete('/:clinicId/packages/:packageId', authenticate, clinicAccess, authorize('doctor'), requireFeature('packages'), clinicController.deletePackage);

module.exports = router;
