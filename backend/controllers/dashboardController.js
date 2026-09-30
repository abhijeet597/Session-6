const Habit = require('../models/Habit');

function allCompletedDates(habits) {
  const dates = new Set();
  habits.forEach((habit) => {
    habit.completedDates.forEach((date) => dates.add(date));
  });
  return dates;
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function currentStreak(completedDateSet) {
  let streak = 0;
  const cursor = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

  // If today has no completions yet, start counting from yesterday instead,
  // so an in-progress streak isn't reset to 0 before the day is over.
  if (!completedDateSet.has(toISO(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (completedDateSet.has(toISO(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function longestStreak(completedDateSet) {
  const sortedDates = [...completedDateSet].sort();
  let longest = 0;
  let current = 0;
  let prev = null;

  sortedDates.forEach((dateStr) => {
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (prev) {
      const dayDiff = Math.round((date - prev) / 86400000);
      current = dayDiff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prev = date;
  });

  return longest;
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const diff = (day + 6) % 7; // Days since Monday.
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function thisWeekCompletionRate(habits) {
  if (habits.length === 0) return 0;

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const weekStart = startOfWeek(today);
  const daysSoFar = Math.round((today - weekStart) / 86400000) + 1;

  let possible = 0;
  let completed = 0;

  habits.forEach((habit) => {
    for (let i = 0; i < daysSoFar; i += 1) {
      const day = new Date(weekStart);
      day.setUTCDate(day.getUTCDate() + i);
      const dayStr = toISO(day);
      possible += 1;
      if (habit.completedDates.includes(dayStr)) {
        completed += 1;
      }
    }
  });

  return possible === 0 ? 0 : completed / possible;
}

function completionsByCategory(habits) {
  const breakdown = {};
  habits.forEach((habit) => {
    breakdown[habit.category] = (breakdown[habit.category] || 0) + habit.completedDates.length;
  });
  return breakdown;
}

async function getDashboard(req, res) {
  const habits = await Habit.find({ userId: req.userId, paused: { $ne: true } });
  const completedDateSet = allCompletedDates(habits);

  res.json({
    currentStreak: currentStreak(completedDateSet),
    longestStreak: longestStreak(completedDateSet),
    thisWeekCompletionRate: thisWeekCompletionRate(habits),
    completionsByCategory: completionsByCategory(habits),
  });
}

module.exports = { getDashboard };
