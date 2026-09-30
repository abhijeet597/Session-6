const Habit = require('../models/Habit');
const Category = require('../models/Category');

async function getHabits(req, res) {
  const habits = await Habit.find({ userId: req.userId });
  res.json(habits);
}

async function createHabit(req, res) {
  const { name, category, frequency, dayOfMonth } = req.body;
  if (!name || !category || !frequency) {
    return res.status(400).json({ error: 'name, category, and frequency are all required' });
  }
  if (frequency === 'Monthly' && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return res.status(400).json({ error: 'dayOfMonth (1-31) is required for a Monthly habit' });
  }
  const categoryExists = await Category.findOne({ name: category });
  if (!categoryExists) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const habit = await Habit.create({
    userId: req.userId,
    name, category, frequency,
    dayOfMonth: frequency === 'Monthly' ? dayOfMonth : undefined,
    createdDate: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(habit);
}

async function updateHabit(req, res) {
  const { id } = req.params;
  const { name, category, frequency, dayOfMonth, completedDates, paused } = req.body;
  const updated = await Habit.findOneAndUpdate(
    { _id: id, userId: req.userId },
    { name, category, frequency, dayOfMonth, completedDates, paused },
    { new: true, runValidators: true }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Habit not found' });
  }
  res.json(updated);
}

async function deleteHabit(req, res) {
  const { id } = req.params;
  const deleted = await Habit.findOneAndDelete({ _id: id, userId: req.userId });
  if (!deleted) {
    return res.status(404).json({ error: 'Habit not found' });
  }
  res.status(204).send();
}


async function togglePauseHabit(req, res) {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  habit.paused = !habit.paused;
  await habit.save();
  res.json(habit);
}

module.exports = { getHabits, createHabit, updateHabit, deleteHabit, togglePauseHabit };