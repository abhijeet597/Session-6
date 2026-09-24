# React Component Decomposition: Habit Tracker Migration Plan

## Q1: What is the full component hierarchy?

### Takeaway
The app maps cleanly onto a three-level hierarchy: `App` at the root holds routing and global context; three page-level components (`LoginPage`, `SignupPage`, `HabitsPage`) handle full screens; and four leaf components (`HabitForm`, `CategoryForm`, `Toolbar`, `HabitTable`/`HabitRow`) handle individual UI sections.

### Cited Findings
- React's official "Thinking in React" guide recommends mirroring your data model's structure in your component tree, since UI and data share the same information architecture — [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)
- Page-level components (full screens) should be separate from feature components (reusable UI blocks) — [brainhub.eu/library/migrating-to-react](https://brainhub.eu/library/migrating-to-react)
- React Router v6 layout routes (no `path` prop) create structural nesting without adding URL segments, making them ideal for wrapping authenticated sections — [reactrouter.com/start/library/routing](https://reactrouter.com/start/library/routing)

### Full Hierarchy

```
App
├── AuthContext.Provider          (wraps entire tree)
│
├── BrowserRouter
│   └── Routes
│       ├── Route path="/login"   → LoginPage
│       ├── Route path="/signup"  → SignupPage
│       └── Route element=<ProtectedRoute>   (layout route — no path)
│           └── Route path="/"    → HabitsPage
│               ├── AppHeader
│               ├── HabitForm
│               │   └── CategoryForm         (inline sub-form)
│               ├── Toolbar
│               └── HabitTable
│                   └── HabitRow             (one per habit)
```

### Component Descriptions

| Component | File | Replaces |
|---|---|---|
| `App` | `src/App.jsx` | Top of `index.html`; bootstraps context + router |
| `AuthContext` | `src/context/AuthContext.jsx` | `getToken`, `setToken`, `clearToken`, `authHeaders` in `habits.js` |
| `ProtectedRoute` | `src/components/ProtectedRoute.jsx` | The `if (getToken())` guard at bottom of `main.js` |
| `LoginPage` | `src/pages/LoginPage.jsx` | `login.html` + login block in `auth-pages.js` |
| `SignupPage` | `src/pages/SignupPage.jsx` | `signup.html` + signup block in `auth-pages.js` |
| `AppHeader` | `src/components/AppHeader.jsx` | `<header class="app-header">` in `index.html`; logout wiring in `main.js` |
| `HabitsPage` | `src/pages/HabitsPage.jsx` | `initApp()`, `applyFilters()`, `renderSorted()` in `main.js`; orchestrates habits + categories state |
| `HabitForm` | `src/components/HabitForm.jsx` | `<form id="add-habit-form">` in `index.html`; submit handler + frequency-toggle logic in `main.js` |
| `CategoryForm` | `src/components/CategoryForm.jsx` | `<div class="add-category-row">` + `add-category-form` submit handler in `main.js` |
| `Toolbar` | `src/components/Toolbar.jsx` | `.toolbar-bar` section in `index.html`; sort/filter change handlers + clear button in `main.js` |
| `HabitTable` | `src/components/HabitTable.jsx` | `<table id="habit-table">` + `renderHabitList()` from `render.js` |
| `HabitRow` | `src/components/HabitRow.jsx` | Per-row `<tr>` built inside `renderHabitList()`; delete/edit/check-in click handlers from `main.js` |

### Inferences
- `CategoryForm` lives inside the `HabitForm` card (same `.card` div in `index.html`), so it should be a child of `HabitForm` in JSX — or a sibling rendered by `HabitsPage` in the same card wrapper.
- `AppHeader` is simple enough that it could be inlined in `HabitsPage`, but extracting it keeps logout logic contained and testable.

### Gaps
- The current `updateHabit` flow uses a `window.prompt()`. The React version needs an inline edit UI (e.g. an editable select in `HabitRow`), but the exact UI pattern is a design decision for the implementation phase, not this research.

---

## Q2: Which components hold state vs. receive props?

### Takeaway
State lives as high as it must: auth state in `AuthContext`, the full habits and categories lists in `HabitsPage`, and purely local UI state (form field values, sort/filter inputs) in the component that owns the field.

### Cited Findings
- React docs: place state in the lowest common ancestor of all components that need it — [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)
- `useState` is appropriate for simple, independent state; `useReducer` is better for multiple interconnected state transitions — [react.dev/learn/extracting-state-logic-into-a-reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)

### State Ownership Table

| Component | Own State | Props Received |
|---|---|---|
| `AuthContext` | `token` (string\|null) | — |
| `HabitsPage` | `habits[]`, `categories[]`, `sortField`, `sortDir`, `filterCategory`, `filterDateFrom`, `filterDateTo` | — |
| `HabitForm` | `name`, `category` (selected), `frequency`, `dayOfMonth` | `categories[]`, `onHabitAdded()` |
| `CategoryForm` | `newCategoryName` | `onCategoryAdded()` |
| `Toolbar` | none (fully controlled) | `sortField`, `sortDir`, `filterCategory`, `filterDateFrom`, `filterDateTo`, `categories[]`, `onSortChange()`, `onFilterChange()`, `onClearFilters()` |
| `HabitTable` | none | `habits[]` (already filtered+sorted), `onDelete()`, `onEdit()`, `onCheckIn()` |
| `HabitRow` | `isEditing` (bool) — for inline edit mode | one `habit` object, `onDelete()`, `onEdit()`, `onCheckIn()` |
| `LoginPage` | `email`, `password`, `error` | — |
| `SignupPage` | `email`, `password`, `error` | — |
| `AppHeader` | none | `onLogout()` |

### Inferences
- `HabitsPage` owns `habits[]` and `categories[]` because both `HabitForm` (needs categories for the dropdown), `Toolbar` (needs categories for the filter dropdown), and `HabitTable` (needs the habit list) depend on them — making `HabitsPage` the correct lowest common ancestor.
- Sort and filter state also lives in `HabitsPage` so it can compute the derived display list (`filterHabits(sortHabits(habits))`) in one place and pass the result down to `HabitTable`.
- `HabitRow` can hold its own `isEditing` boolean — the current edit flow is row-local; no sibling or parent needs to know which row is being edited.

### Gaps
- Whether to use `useReducer` for `HabitsPage` state (vs multiple `useState` calls) is a judgment call at implementation time; either works. A `useReducer` with actions like `HABITS_LOADED`, `HABIT_ADDED`, `HABIT_DELETED`, `HABIT_UPDATED` would be cleaner if more action types are expected (e.g. pagination, undo).

---

## Q3: Where does shared state live — lifted to App, or in a Context?

### Takeaway
Auth token lives in `AuthContext` (consumed by the API layer and `ProtectedRoute`). Habits and categories live in `HabitsPage` state (not Context) because they are only needed within the authenticated app section, not across unrelated branches.

### Cited Findings
- `useContext` is the right tool for global data like auth tokens that many components need without explicit prop-passing — [sammeechward.com auth+context article](https://www.sammeechward.com/use-context-auth)
- Auth context pattern: `createContext` + provider that exposes `{ token, login, logout }`; token is persisted to/restored from `localStorage` on mount — [sammeechward.com](https://www.sammeechward.com/use-context-auth)
- FreeCodeCamp guide confirms: share auth state via Context, keep domain data (lists of items) in the component that renders them — [freecodecamp.org state management with react hooks](https://www.freecodecamp.org/news/state-management-with-react-hooks/)

### Recommended Structure

**`src/context/AuthContext.jsx`**
```jsx
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('habitTracker.token'));

  function login(newToken) {
    localStorage.setItem('habitTracker.token', newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem('habitTracker.token');
    setToken(null);
  }

  // authHeaders helper — used by API functions
  const authHeaders = (extra = {}) =>
    token ? { ...extra, Authorization: `Bearer ${token}` } : extra;

  return (
    <AuthContext.Provider value={{ token, login, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**API layer (`src/api/habits.js`, `src/api/auth.js`, `src/api/categories.js`)** receives `authHeaders` as a parameter or reads the context via a custom `useAuth` hook from inside components — NOT from localStorage directly.

### What Does NOT Go in Context
- `habits[]` — only needed in `HabitsPage` and its children; no need for global access
- `categories[]` — same reason
- Sort/filter state — purely local to the habits view

### Inferences
- The vanilla `habits.js` mixes auth utilities with data-fetching functions. In React these should be split: auth helpers go in `AuthContext`, data functions go in `src/api/*.js` modules that accept an `authHeaders` argument.

### Gaps
- None — the pattern here is well-established and directly sourced.

---

## Q4: How do filterHabits/sortHabits translate — utility functions or hooks?

### Takeaway
Keep `filterHabits` and `sortHabits` as pure utility functions imported directly. No hook wrapper is needed. `HabitsPage` calls them synchronously inside the render path to compute the display list.

### Cited Findings
- React docs: data that can be computed from existing state (filtered/sorted list) is not state itself — it is a derived value computed during render — [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)
- Pure functions with no side effects and no React dependencies do not need to be wrapped in hooks — [react.dev/learn/extracting-state-logic-into-a-reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)

### Recommended Pattern

```jsx
// src/utils/filterSort.js  (rename/move existing filter.js)
export { filterHabits, sortHabits, todayISO, getNextDueDate };

// In HabitsPage.jsx
import { filterHabits, sortHabits } from '../utils/filterSort';

function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Derived — computed on every render, never stored in state
  const displayedHabits = sortHabits(
    filterHabits(habits, filterCategory, filterDateFrom ? new Date(filterDateFrom) : null, filterDateTo ? new Date(filterDateTo) : null),
    sortField,
    sortDir
  );

  return <HabitTable habits={displayedHabits} ... />;
}
```

### Inferences
- The existing `filter.js` already exports via `module.exports` for Node tests. For React, add named ES module exports (or replace the CommonJS export with ES module syntax) so Vite/bundler tree-shaking works. The test file will need a small update to use `import` instead of `require`, but the function bodies are unchanged.
- `useMemo` could wrap the derived list if profiling shows re-render performance issues with very large habit lists, but is not needed by default.

### Gaps
- None for this scope.

---

## Q5: How is the "Add Category" sub-form relationship to the HabitForm modelled?

### Takeaway
`CategoryForm` is a sibling rendered inside the same card as `HabitForm`, both children of `HabitsPage`. When a category is added, `HabitsPage` refreshes the `categories[]` state, which flows down as a prop to both `HabitForm` (for the habit category dropdown) and `Toolbar` (for the filter dropdown).

### Cited Findings
- React "lifting state up" pattern: when two sibling components need the same data, move that data to their closest common parent — [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)
- The React docs' `FilterableProductTable` example is structurally identical: a search input (analogous to `CategoryForm`) and a display list (analogous to `HabitForm`'s dropdown) both consume the same parent state — [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react)

### Recommended Pattern

```jsx
// HabitsPage.jsx (simplified)
function HabitsPage() {
  const [categories, setCategories] = useState([]);

  async function handleCategoryAdded() {
    const updated = await getCategories(authHeaders());
    setCategories(updated);
  }

  async function handleHabitAdded() {
    const updated = await getHabits(authHeaders());
    setHabits(updated);
  }

  return (
    <div className="card form-section">
      <HabitForm
        categories={categories}
        onHabitAdded={handleHabitAdded}
      />
      <CategoryForm onCategoryAdded={handleCategoryAdded} />
    </div>
  );
}
```

`CategoryForm` is responsible only for its own input field and the POST request. After success it calls `onCategoryAdded()` — the parent decides what to do (re-fetch categories). This replaces the vanilla pattern where `refreshCategoryOptions()` in `main.js` directly reached into two separate `<select>` elements by id.

### Inferences
- `CategoryForm` has no need to know about habits; `HabitForm` has no need to know about the category creation API. The callback prop pattern keeps them fully decoupled.

### Gaps
- None.

---

## Q6: What replaces the event delegation pattern on #habit-list-body?

### Takeaway
React's synthetic event system makes per-element `onClick` props on each `HabitRow` equivalent in performance to vanilla event delegation; no manual delegation is needed. Each action (delete, edit, check-in) becomes a callback prop passed from `HabitTable` down to `HabitRow`.

### Cited Findings
- React already implements event delegation internally — all event handlers are attached at the root, not on individual elements — [medium.com event delegation in React](https://medium.com/@john.louis.rumingan/event-capturing-bubbling-and-delegation-in-react-f08b704706a0)
- The correct React pattern for table row actions is to pass handler functions as props, rather than attaching a single listener to the table body — [xjavascript.com table row click events in React](https://www.xjavascript.com/blog/react-triggering-click-event-on-table-row/)
- `useCallback` can stabilize handler references to prevent unnecessary re-renders of memoized row components, but is not needed unless profiling reveals a problem — [medium.com useCallback for event handlers](https://medium.com/@KTAsim/react-performance-event-handlers-using-usecallback-hook-9e4a06f8bb2f)

### Recommended Pattern

```jsx
// HabitTable.jsx
function HabitTable({ habits, onDelete, onEdit, onCheckIn }) {
  return (
    <table>
      <thead>...</thead>
      <tbody>
        {habits.map(habit => (
          <HabitRow
            key={habit._id}
            habit={habit}
            onDelete={onDelete}
            onEdit={onEdit}
            onCheckIn={onCheckIn}
          />
        ))}
      </tbody>
    </table>
  );
}

// HabitRow.jsx
function HabitRow({ habit, onDelete, onEdit, onCheckIn }) {
  const today = todayISO();
  const doneToday = habit.completedDates.includes(today);

  return (
    <tr>
      <td>{habit.name}</td>
      <td>{habit.category}</td>
      <td>{habit.frequency}</td>
      <td>{habit.completedDates.length} check-ins</td>
      <td>
        <button
          disabled={doneToday}
          onClick={() => onCheckIn(habit._id)}
        >
          {doneToday ? 'Checked in ✓' : 'Check in today'}
        </button>
        <button onClick={() => onEdit(habit._id)}>Edit</button>
        <button onClick={() => onDelete(habit._id)}>Delete</button>
      </td>
    </tr>
  );
}
```

The `key={habit._id}` prop on `HabitRow` is essential — it lets React reconcile rows correctly when habits are added or removed.

The `onDelete`, `onEdit`, `onCheckIn` callbacks live in `HabitsPage`, where they call the API and then re-fetch `habits[]`. This replaces the three `document.getElementById('habit-list-body').addEventListener('click', ...)` blocks in `main.js`.

### Inferences
- The vanilla `edit` action opens a `window.prompt()` — this should be replaced with an inline edit UI in `HabitRow` (e.g. toggle an `<input>` or `<select>` in the row). `HabitRow` can hold its own `isEditing` boolean with `useState` for this.
- Because React delegates all events at the root level, there is no performance advantage to manually re-implementing delegation on the `<tbody>` — pass props directly.

### Gaps
- None for event delegation. The inline-edit UI design (what fields are editable, how save/cancel work) is a separate design decision.

---

## Recommended File Layout

```
src/
  api/
    auth.js          # signup(), login() — no auth headers needed
    habits.js        # getHabits(), addHabit(), deleteHabit(), updateHabit(), checkInHabit()
    categories.js    # getCategories(), addCategory()
  context/
    AuthContext.jsx  # token, login(), logout(), authHeaders()
  utils/
    filterSort.js    # filterHabits(), sortHabits(), todayISO(), getNextDueDate() — moved from public/js/filter.js
  pages/
    LoginPage.jsx
    SignupPage.jsx
    HabitsPage.jsx
  components/
    ProtectedRoute.jsx
    AppHeader.jsx
    HabitForm.jsx
    CategoryForm.jsx
    Toolbar.jsx
    HabitTable.jsx
    HabitRow.jsx
  App.jsx            # BrowserRouter + Routes + AuthProvider
  main.jsx           # ReactDOM.createRoot entry point
```

---

## Sources

- [react.dev — Thinking in React](https://react.dev/learn/thinking-in-react)
- [react.dev — Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [React Router — Library Routing](https://reactrouter.com/start/library/routing)
- [Sam Meech-Ward — Auth and Context in React 18](https://www.sammeechward.com/use-context-auth)
- [FreeCodeCamp — State Management with React Hooks](https://www.freecodecamp.org/news/state-management-with-react-hooks/)
- [brainhub.eu — Strategy and Tips for Migrating to React](https://brainhub.eu/library/migrating-to-react)
- [DEV Community — Implementing Protected Routes and Authentication in React (2026 Edition)](https://dev.to/olumidesamuel_/implementing-protected-routes-and-authentication-in-react-2026-edition-4k6e)
- [Medium — Event Delegation in React](https://medium.com/@john.louis.rumingan/event-capturing-bubbling-and-delegation-in-react-f08b704706a0)
- [xjavascript.com — React Table Row Click Events](https://www.xjavascript.com/blog/react-triggering-click-event-on-table-row/)
- [Medium — useCallback for Event Handlers](https://medium.com/@KTAsim/react-performance-event-handlers-using-usecallback-hook-9e4a06f8bb2f)
