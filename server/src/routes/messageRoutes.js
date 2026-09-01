const router = require('express').Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, messageController.sendMessage);
router.get('/my', authenticate, messageController.getMyMessages);
router.put('/:id/read', authenticate, messageController.markAsRead);

module.exports = router;
