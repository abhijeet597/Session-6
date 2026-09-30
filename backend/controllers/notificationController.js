const Notification = require('../models/Notification');
const GroupMembership = require('../models/GroupMembership');

async function getNotifications(req, res) {
  const notifications = await Notification.find({ recipientId: req.userId })
    .populate('groupId', 'name')
    .populate('senderId', 'email')
    .sort({ createdAt: -1 });
  res.json(notifications);
}

async function respondToInvite(req, res) {
  const { action } = req.body;
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be accept or reject' });
  }

  const notification = await Notification.findById(req.params.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  if (notification.recipientId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Not your notification' });
  }

  if (notification.status !== 'pending') {
    return res.status(409).json({ error: 'Invite already responded to' });
  }

  notification.status = action === 'accept' ? 'accepted' : 'rejected';
  await notification.save();

  if (action === 'accept') {
    await GroupMembership.create({ groupId: notification.groupId, userId: req.userId });
  }

  res.json(notification);
}

module.exports = { getNotifications, respondToInvite };
