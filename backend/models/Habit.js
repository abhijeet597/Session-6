const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  frequency: { type: String, required: true, enum: ['Daily', 'Weekly', 'Monthly'] },
  dayOfMonth: { type: Number, min: 1, max: 31 },
  createdDate: { type: String, required: true },
  completedDates: { type: [String], default: [] },
  paused: { type: Boolean, default: false },
});

const Habit = mongoose.model('Habit', habitSchema);

module.exports = Habit;