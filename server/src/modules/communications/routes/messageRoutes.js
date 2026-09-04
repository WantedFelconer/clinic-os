const router = require('express').Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../../../core/middleware/auth');
const { commonValidator } = require('../../../core/validators');
const { requireSharedClinicFeature } = require('../../../core/middleware/subscription');

router.post('/', authenticate, commonValidator.message, requireSharedClinicFeature('messaging'), messageController.sendMessage);
router.get('/recipients', authenticate, messageController.getRecipients);
router.get('/my', authenticate, messageController.getMyMessages);
router.put('/:id/read', authenticate, messageController.markAsRead);

module.exports = router;
