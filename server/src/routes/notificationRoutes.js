const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { paginationValidator } = require('../validators');

router.get('/', authenticate, paginationValidator, authController.getNotifications);
router.put('/read-all', authenticate, authController.markAllNotificationsRead);
router.put('/:id/read', authenticate, authController.markNotificationRead);

module.exports = router;
