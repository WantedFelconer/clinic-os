const router = require('express').Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { commonValidator } = require('../validators');
const { requireSharedClinicFeature } = require('../middleware/subscription');

router.post('/', authenticate, commonValidator.message, requireSharedClinicFeature('messaging'), messageController.sendMessage);
router.get('/recipients', authenticate, messageController.getRecipients);
router.get('/my', authenticate, messageController.getMyMessages);
router.put('/:id/read', authenticate, messageController.markAsRead);

module.exports = router;
