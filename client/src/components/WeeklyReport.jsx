import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/authApi';

function getWeekRange() {
  const today = new Date();
  const day = today.getUTCDay(); // 0=Sun
  const diffToMon = (day + 6) % 7;
  const mon = new Date(today);
  mon.setUTCDate(today.getUTCDate() - diffToMon);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function currentStreak(completedDates) {
  const set = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(`${toISO(new Date())}T00:00:00Z`);
  if (!set.has(toISO(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (set.has(toISO(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function completionRateByCategory(habits) {
  const today = new Date(`${toISO(new Date())}T00:00:00Z`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (6 - i));
    return toISO(d);
  });

  const map = {};
  habits.forEach((h) => {
    if (!map[h.category]) map[h.category] = { habits: 0, possible: 0, completed: 0 };
    map[h.category].habits += 1;
    if (h.frequency === 'Daily') {
      days.forEach((day) => {
        map[h.category].possible += 1;
        if (h.completedDates.includes(day)) map[h.category].completed += 1;
      });
    } else if (h.frequency === 'Weekly') {
      map[h.category].possible += 1;
      if (days.some((d) => h.completedDates.includes(d))) map[h.category].completed += 1;
    }
  });
  return map;
}

function atRiskHabits(habits) {
  const today = toISO(new Date());
  return habits.filter((h) => {
    const streak = currentStreak(h.completedDates);
    if (streak < 3) return false;
    if (h.frequency === 'Daily') return !h.completedDates.includes(today);
    if (h.frequency === 'Weekly') {
      const d = new Date();
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
      const days = Array.from({ length: 7 }, (_, i) => {
        const x = new Date(weekStart);
        x.setUTCDate(weekStart.getUTCDate() + i);
        return toISO(x);
      });
      return !days.some((day) => h.completedDates.includes(day));
    }
    return false;
  }).map((h) => ({
    ...h,
    streak: currentStreak(h.completedDates),
    lastCheckIn: h.completedDates.length ? h.completedDates[h.completedDates.length - 1] : '—',
  }));
}

export default function WeeklyReport({ onClose }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/habits', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch habits');
        const data = await res.json();
        setHabits(data.filter((h) => !h.paused));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = [...habits].sort((a, b) => currentStreak(b.completedDates) - currentStreak(a.completedDates));
  const catRates = completionRateByCategory(habits);
  const atRisk = atRiskHabits(habits);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Weekly Habit Report</h2>
            <p className="modal-subtitle">{getWeekRange()}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {loading && <p className="report-loading">Loading report…</p>}
          {error && <p className="report-error">{error}</p>}

          {!loading && !error && (
            <>
              {/* Streak Leaderboard */}
              <section className="report-section">
                <h3 className="report-section-title">🏆 Streak Leaderboard</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Habit</th>
                      <th>Category</th>
                      <th>Frequency</th>
                      <th>Current Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr><td colSpan={5} className="report-empty">No habits yet.</td></tr>
                    ) : sorted.map((h, i) => (
                      <tr key={h._id}>
                        <td className="report-rank">#{i + 1}</td>
                        <td>{h.name}</td>
                        <td>{h.category}</td>
                        <td>{h.frequency}</td>
                        <td className="report-streak">
                          {currentStreak(h.completedDates) > 0
                            ? `🔥 ${currentStreak(h.completedDates)}d`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Completion Rates by Category */}
              <section className="report-section">
                <h3 className="report-section-title">📊 Completion Rates by Category (last 7 days)</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Habits</th>
                      <th>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(catRates).length === 0 ? (
                      <tr><td colSpan={3} className="report-empty">No data.</td></tr>
                    ) : Object.entries(catRates).map(([cat, data]) => {
                      const rate = data.possible === 0 ? 0 : Math.round((data.completed / data.possible) * 100);
                      return (
                        <tr key={cat}>
                          <td>{cat}</td>
                          <td>{data.habits}</td>
                          <td>
                            <div className="report-rate-bar-wrap">
                              <div className="report-rate-bar" style={{ width: `${rate}%` }} />
                              <span className="report-rate-label">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {/* At-Risk Habits */}
              <section className="report-section">
                <h3 className="report-section-title">⚠️ At-Risk Habits</h3>
                {atRisk.length === 0 ? (
                  <p className="report-all-good">All streaks are safe — great work!</p>
                ) : (
                  <table className="report-table report-table--risk">
                    <thead>
                      <tr>
                        <th>Habit</th>
                        <th>Streak</th>
                        <th>Last Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.map((h) => (
                        <tr key={h._id}>
                          <td>{h.name}</td>
                          <td>🔥 {h.streak}d</td>
                          <td>{h.lastCheckIn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </div>

        <div className="modal-footer">
          Generated {today} · {habits.length} habit{habits.length !== 1 ? 's' : ''} tracked
        </div>
      </div>
    </div>
  );
}
