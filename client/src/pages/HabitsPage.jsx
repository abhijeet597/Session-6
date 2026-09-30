import { useEffect, useReducer, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../lib/authApi';
import NotificationBell from '../components/NotificationBell';
import {
  getHabits,
  addHabit,
  deleteHabit,
  updateHabit,
  checkInHabit,
  pauseHabit,
  getCategories,
  addCategory,
} from '../lib/habits';
import { filterHabits, sortHabits } from '../lib/filter';
import HabitList from '../components/HabitList';
import FilterBar from '../components/FilterBar';
import Dashboard from '../components/Dashboard';
import AddHabitForm from '../components/AddHabitForm';
import AddCategoryForm from '../components/AddCategoryForm';

const SORT_KEY = 'habitTracker.sort';

function loadSort() {
  try {
    const stored = JSON.parse(localStorage.getItem(SORT_KEY));
    if (stored && stored.field && stored.dir) return stored;
  } catch {
    // ignore
  }
  return { field: 'name', dir: 'asc' };
}

function saveSort(sort) {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(sort));
  } catch {
    // ignore
  }
}

const initialState = {
  habits: [],
  categories: [],
  dashboardData: null,
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADED':
      return { ...state, habits: action.habits, categories: action.categories, dashboardData: action.dashboardData, loading: false, error: null };
    case 'SET_HABITS':
      return { ...state, habits: action.habits };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };
    case 'SET_DASHBOARD':
      return { ...state, dashboardData: action.data };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export default function HabitsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sort, setSort] = useState(loadSort);

  const token = getAuthToken();

  const fetchAll = useCallback(async () => {
    try {
      const [habits, categories] = await Promise.all([
        getHabits(token),
        getCategories(token),
      ]);

      let dashboardData = null;
      try {
        const res = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) dashboardData = await res.json();
      } catch {
        // dashboard is non-critical
      }

      dispatch({ type: 'LOADED', habits, categories, dashboardData });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    saveSort(sort);
  }, [sort]);

  async function handleAddHabit(name, category, frequency, dayOfMonth) {
    await addHabit(name, category, frequency, dayOfMonth, token);
    await fetchAll();
  }

  async function handleAddCategory(name) {
    await addCategory(name, token);
    const categories = await getCategories(token);
    dispatch({ type: 'SET_CATEGORIES', categories });
  }

  async function handleDelete(id) {
    await deleteHabit(id, token);
    await fetchAll();
  }

  async function handleEdit(id) {
    const frequency = window.prompt('Enter new frequency (Daily, Weekly, or Monthly):');
    if (!['Daily', 'Weekly', 'Monthly'].includes(frequency)) return;
    await updateHabit(id, { frequency }, token);
    await fetchAll();
  }

  async function handlePause(id) {
    await pauseHabit(id, token);
    await fetchAll();
  }

  async function handleCheckIn(id) {
    const habit = state.habits.find((h) => h._id === id);
    if (!habit) return;
    const today = new Date().toISOString().slice(0, 10);
    if (habit.completedDates.includes(today)) return;
    const updated = [...habit.completedDates, today];
    await checkInHabit(id, updated, token);
    await fetchAll();
  }

  function handleFilterChange(key, value) {
    if (key === 'category') setFilterCategory(value);
    if (key === 'dateFrom') setFilterDateFrom(value);
    if (key === 'dateTo') setFilterDateTo(value);
  }

  function handleSortChange(key, value) {
    setSort((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  const dateFrom = filterDateFrom ? new Date(`${filterDateFrom}T00:00:00Z`) : null;
  const dateTo = filterDateTo ? new Date(`${filterDateTo}T00:00:00Z`) : null;
  const filtered = filterHabits(state.habits, filterCategory, dateFrom, dateTo);
  const displayed = sortHabits(filtered, sort.field, sort.dir);

  const header = (
    <header className="app-header">
      <h1>Habit Tracker</h1>
      <div className="header-actions">
        <button type="button" className="btn-nav" onClick={() => navigate('/groups')}>Groups</button>
        <NotificationBell />
        <button type="button" className="btn-logout" onClick={logout}>Log Out</button>
      </div>
    </header>
  );

  if (state.loading) {
    return (
      <div id="app-container">
        {header}
        <main className="app-main">
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>Loading…</p>
        </main>
      </div>
    );
  }

  if (state.error) {
    return (
      <div id="app-container">
        {header}
        <main className="app-main">
          <p style={{ color: 'var(--color-danger)', padding: '3rem', textAlign: 'center' }}>{state.error}</p>
        </main>
      </div>
    );
  }

  return (
    <div id="app-container">
      {header}

      <main className="app-main">
        {/* Add Habit + Add Category */}
        <div className="card form-section">
          <div className="form-section-header">
            <div className="form-section-icon">＋</div>
            <div>
              <p className="section-title">Add Habit</p>
              <p className="section-subtitle">Track a new habit to build consistency</p>
            </div>
          </div>
          <AddHabitForm categories={state.categories} onSubmit={handleAddHabit} />
          <div className="add-category-row">
            <span className="add-category-label">Add Category</span>
            <AddCategoryForm onSubmit={handleAddCategory} />
          </div>
        </div>

        {/* Dashboard */}
        {state.dashboardData && (
          <div className="card dashboard-card">
            <Dashboard data={state.dashboardData} />
          </div>
        )}

        {/* Table + Toolbar */}
        <div className="table-section">
          <FilterBar
            categories={state.categories}
            filterCategory={filterCategory}
            filterDateFrom={filterDateFrom}
            filterDateTo={filterDateTo}
            sortField={sort.field}
            sortDir={sort.dir}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onClearFilters={handleClearFilters}
          />
          <HabitList
            habits={displayed}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onCheckIn={handleCheckIn}
            onPause={handlePause}
          />
        </div>
      </main>
    </div>
  );
}
