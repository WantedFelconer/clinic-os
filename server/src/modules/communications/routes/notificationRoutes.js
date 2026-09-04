const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../../../core/middleware/auth');
const { paginationValidator } = require('../../../core/validators');

router.get('/', authenticate, paginationValidator, notificationController.getNotifications);
router.put('/read-all', authenticate, notificationController.markAllNotificationsRead);
router.put('/:id/read', authenticate, notificationController.markNotificationRead);

module.exports = router;
