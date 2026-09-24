// HabitList.jsx — presentational table component
// MongoDB documents use _id, not id.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function HabitList({ habits, onDelete, onEdit, onCheckIn }) {
  const today = todayISO();
  const totalCheckIns = habits.reduce((sum, h) => sum + h.completedDates.length, 0);

  return (
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
            return (
              <tr key={habit._id}>
                <td>{habit.name}</td>
                <td>{habit.category}</td>
                <td>{habit.frequency}</td>
                <td>{habit.completedDates.length} check-ins</td>
                <td>
                  <button
                    type="button"
                    className="check-in-btn"
                    onClick={() => onCheckIn(habit._id)}
                    disabled={done}
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
  );
}
