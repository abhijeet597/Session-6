const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Habit = require('../models/Habit');

async function createGroup(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const group = await Group.create({ name, ownerId: req.userId });
  await GroupMembership.create({ groupId: group._id, userId: req.userId });
  res.status(201).json(group);
}

async function getGroups(req, res) {
  const memberships = await GroupMembership.find({ userId: req.userId });
  const groupIds = memberships.map((m) => m.groupId);
  const groups = await Group.find({ _id: { $in: groupIds } });
  res.json(groups);
}

async function inviteMember(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  if (group.ownerId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'Only the group owner can invite members' });
  }

  const recipient = await User.findOne({ email });
  if (!recipient) return res.status(404).json({ error: 'User not found' });

  const alreadyMember = await GroupMembership.findOne({ groupId: group._id, userId: recipient._id });
  if (alreadyMember) return res.status(409).json({ error: 'User is already a member' });

  const existing = await Notification.findOne({
    recipientId: recipient._id, groupId: group._id, type: 'GROUP_INVITE', status: 'pending',
  });
  if (existing) return res.status(409).json({ error: 'Invite already sent' });

  const notification = await Notification.create({
    recipientId: recipient._id,
    senderId: req.userId,
    type: 'GROUP_INVITE',
    groupId: group._id,
    status: 'pending',
  });
  res.status(201).json(notification);
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function currentStreak(completedDateSet) {
  let streak = 0;
  const cursor = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  if (!completedDateSet.has(toISO(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (completedDateSet.has(toISO(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function getGroupStreaks(req, res) {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const membership = await GroupMembership.findOne({ groupId: group._id, userId: req.userId });
  if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

  const memberships = await GroupMembership.find({ groupId: group._id });
  const memberIds = memberships.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } });

  const results = await Promise.all(users.map(async (user) => {
    const habits = await Habit.find({ userId: user._id });
    const dates = new Set();
    habits.forEach((h) => h.completedDates.forEach((d) => dates.add(d)));
    return { userId: user._id, email: user.email, streak: currentStreak(dates) };
  }));

  results.sort((a, b) => b.streak - a.streak);
  res.json(results);
}

module.exports = { createGroup, getGroups, inviteMember, getGroupStreaks };
