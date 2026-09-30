// HabitList.jsx — presentational table component
// MongoDB documents use _id, not id.

import { useState } from 'react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function isBrokenStreak(habit) {
  if (!habit.completedDates || habit.completedDates.length === 0) return false;
  const today = todayISO();
  const yesterday = yesterdayISO();
  return !habit.completedDates.includes(today) && !habit.completedDates.includes(yesterday);
}

function getLastStreakLength(completedDates) {
  const sorted = [...completedDates].sort().reverse();
  if (!sorted.length) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`);
    const curr = new Date(`${sorted[i]}T00:00:00Z`);
    if ((prev - curr) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

// Applies streak-recovery-suggester skill logic from .claude/skills/streak-recovery-suggester/SKILL.md
function generateRecoveryTip(habit, lastStreak) {
  const cat = (habit.category || '').toLowerCase();
  const name = habit.name;
  const nameLower = name.toLowerCase();

  let action;
  if (/exercise|fitness|workout|run|gym|walk|yoga|sport/.test(cat) || /run|walk|workout|gym|yoga|exercise|sport/.test(nameLower)) {
    action = `do a 10-minute walk at your normal ${name} time instead of the full session`;
  } else if (/read|learn|study|book|course|class/.test(cat) || /read|study|learn|book/.test(nameLower)) {
    action = `spend just 5 minutes on ${name} — one page or one short video`;
  } else if (/meditat|mindful|journal|breath|reflect/.test(cat) || /meditat|journal|mindful|breath/.test(nameLower)) {
    action = `write one sentence or take three deep breaths at your usual ${name} time`;
  } else if (/eat|diet|nutrit|food|water|drink/.test(cat) || /eat|diet|water|food/.test(nameLower)) {
    action = `aim for just one compliant meal today instead of full-day compliance`;
  } else {
    action = `do half the normal effort for ${name} — same time slot, lower bar`;
  }

  const streakText = lastStreak > 1 ? `${lastStreak}-day` : 'previous';
  return `Your ${streakText} ${name} streak broke — one missed day doesn't erase that progress. ${action.charAt(0).toUpperCase() + action.slice(1)}. One smaller session is all it takes to re-establish the habit signal before the full routine comes back.`;
}

export default function HabitList({ habits, onDelete, onEdit, onCheckIn, onPause }) {
  const today = todayISO();
  const totalCheckIns = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
  const [recoveryHabit, setRecoveryHabit] = useState(null);

  const tip = recoveryHabit
    ? generateRecoveryTip(recoveryHabit, getLastStreakLength(recoveryHabit.completedDates))
    : null;

  return (
    <>
      <table id="habit-table">
        <thead>
          <tr>
            <th>Habit</th>
            <th>Category</th>
            <th>Frequency</th>
            <th>Check-ins</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="habit-list-body">
          {habits.length === 0 ? (
            <tr>
              <td colSpan={5}>No habits match these filters.</td>
            </tr>
          ) : (
            habits.map((habit) => {
              const done = habit.completedDates.includes(today);
              const broken = isBrokenStreak(habit);
              return (
                <tr key={habit._id} className={habit.paused ? 'habit-row--paused' : ''}>
                  <td>
                    {habit.name}
                    {habit.paused && <span className="paused-badge">Paused</span>}
                  </td>
                  <td>{habit.category}</td>
                  <td>{habit.frequency}</td>
                  <td>{habit.completedDates.length} check-ins</td>
                  <td>
                    <button
                      type="button"
                      className="check-in-btn"
                      onClick={() => onCheckIn(habit._id)}
                      disabled={done || habit.paused}
                    >
                      {done ? 'Checked in ✓' : 'Check in today'}
                    </button>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => onEdit(habit._id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={habit.paused ? 'resume-btn' : 'pause-btn'}
                      onClick={() => onPause(habit._id)}
                    >
                      {habit.paused ? 'Resume' : 'Pause'}
                    </button>
                    {broken && (
                      <button
                        type="button"
                        className="recovery-btn"
                        onClick={() => setRecoveryHabit(habit)}
                      >
                        Recovery Tip
                      </button>
                    )}
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => onDelete(habit._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {recoveryHabit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRecoveryHabit(null)}>
          <div className="modal-box recovery-modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">💪 Recovery Tip</h2>
                <p className="modal-subtitle">{recoveryHabit.name}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setRecoveryHabit(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <p className="recovery-tip-text">{tip}</p>
            </div>
            <div className="modal-footer">
              Streak Recovery Suggester · {recoveryHabit.frequency} habit
            </div>
          </div>
        </div>
      )}
    </>
  );
}
