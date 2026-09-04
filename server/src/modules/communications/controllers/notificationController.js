/** Notification handlers owned by the communications bounded context. */
const { Notification } = require('..');

const notificationController = {
  async getNotifications(req, res, next) {
    try {
      const page = Number.parseInt(req.query.page, 10) || 1;
      res.json(await Notification.findByUser(req.user.id, page));
    } catch (error) { next(error); }
  },
  async markNotificationRead(req, res, next) {
    try {
      const notification = await Notification.markAsRead(req.params.id, req.user.id);
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      return res.json({ notification });
    } catch (error) { return next(error); }
  },
  async markAllNotificationsRead(req, res, next) {
    try {
      await Notification.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) { next(error); }
  },
};

module.exports = notificationController;
