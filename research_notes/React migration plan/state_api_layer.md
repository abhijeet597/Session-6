# State Management and API Layer Patterns for React Migration

---

## Key Question 1: Should API functions be plain async functions in `src/api/` or wrapped in custom hooks?

### Takeaway
The recommended approach is a **two-layer architecture**: keep plain async functions in a `src/api/` module (one file per resource), and create separate custom hooks that call those functions and own the loading/error/data state. This gives you testable API functions that are not coupled to React and reusable hooks that are not entangled with fetch mechanics.

### Cited Findings
- A plain async function layer in `api/habits.js` exports calls like `fetchStudents(url)` that throw on non-OK responses; the hook layer (`hooks/useHabits.js`) wraps these with `useState` for `data`, `isPending`, and `error` — [OpenReplay: Building a Custom Fetch Hook in React](https://blog.openreplay.com/building-a-custom-fetch-hook-in-react/)
- Robin Wieruch's tutorial explicitly recommends passing an API `queryFn` callback *into* the hook rather than embedding the URL in the hook itself, so "the hook itself doesn't know anything about the API" — [Robin Wieruch: React Hooks Fetch Data](https://www.robinwieruch.de/react-hooks-fetch-data/)
- Wieruch's tutorial notes that the plain-async-function + hook pattern covers the learning case but recommends React Query for production caching/race-condition needs — this project explicitly bans React Query, so the two-layer plain-hooks approach is the appropriate ceiling — [Robin Wieruch: React Hooks Fetch Data](https://www.robinwieruch.de/react-hooks-fetch-data/)

### Inferences
- The existing `public/js/habits.js` already *is* the plain-async layer. For the React migration, rename/move it to `src/api/habits.js`, change the token read to use the AuthContext getter, and keep all `fetch()` calls there. Create `src/hooks/useHabits.js` and `src/hooks/useCategories.js` to wrap those calls with React state.
- Keeping API functions outside hooks makes them directly unit-testable with Node's test runner (already established in the project).

### Recommended concrete structure

```
src/
  api/
    auth.js        // signup(), login()  — no React dependencies
    habits.js      // getHabits(), addHabit(), deleteHabit(), updateHabit(), checkInHabit()
    categories.js  // getCategories(), addCategory()
  hooks/
    useHabits.js   // owns habits[], loading, error; exposes add/delete/update/checkIn actions
    useCategories.js
  context/
    AuthContext.js // token state + helpers
```

**`src/api/habits.js` skeleton (plain functions, no React)**:
```js
const API_BASE = '/api/habits';

function authHeaders(token, extra = {}) {
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export async function getHabits(token) {
  const res = await fetch(API_BASE, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed');
  return res.json();
}
// ... same pattern for addHabit, deleteHabit, updateHabit, checkInHabit
```

**`src/hooks/useHabits.js` skeleton**:
```js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHabits, addHabit, deleteHabit, updateHabit, checkInHabit } from '../api/habits';

export function useHabits() {
  const { token } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHabits(token);
      setHabits(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  return { habits, loading, error, refresh, /* add, remove, update, checkIn */ };
}
```

### Gaps
- No 2024–2025 article found that specifically addresses the JavaScript (non-TypeScript) two-layer pattern for Express-backed apps without React Query; all examples are generic but the pattern is well-established.

---

## Key Question 2: How should the auth token be managed — React context, localStorage only, or both?

### Takeaway
Use **both**: store the token in an `AuthContext` (React state) so components re-render on login/logout, and mirror it to `localStorage` under the existing key `'habitTracker.token'` so it survives page refresh. On mount, initialise the context state by reading from localStorage.

### Cited Findings
- The common pattern is `createContext`, `useState` for the token, and syncing state changes to localStorage through helper setToken/clearToken functions; a `useAuth` custom hook wraps `useContext` for convenient access — [Medium: Token based authentication with local storage in React js](https://medium.com/@rajivchaulagain01/token-based-authentication-with-local-storage-in-react-js-with-usecontext-and-usestate-f26de3191d24) (note: article returned 403 during fetch, but the search snippet confirms this pattern)
- The most secure approach stores short-lived access tokens in memory (React state/context) and long-lived refresh tokens in HttpOnly cookies; for this project (no refresh-token flow, token in localStorage already), the memory+localStorage hybrid is the practical choice — [CyberSierra: JWT Storage in React](https://www.cybersierra.co/blog/react-jwt-storage-guide)

### Inferences
- Token-only-in-localStorage (no context) means every API call must call `localStorage.getItem()` directly, spreads token knowledge everywhere, and won't trigger re-renders on login/logout. Context + localStorage is strictly better.
- Token-only-in-context (no localStorage) breaks on page refresh. Since the current code already persists to localStorage under `'habitTracker.token'`, the migration should preserve that key to avoid logging users out during a gradual rollout.

### Recommended `AuthContext.js` skeleton:

```js
import { createContext, useContext, useState, useCallback } from 'react';

const TOKEN_KEY = 'habitTracker.token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });

  const setToken = useCallback((t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
    setTokenState(t);
  }, []);

  const clearToken = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

Then in API functions, accept `token` as a parameter (see Question 1 skeleton) so they stay pure.

### Gaps
- No source directly addressed the "pass token as parameter to API functions vs read from context inside API functions" split; the inference that plain functions should receive token as a param (to keep them framework-independent) is an architectural inference, not a cited finding.

---

## Key Question 3: How should the habit list + filter/sort state be held — one big useState in App, or a useReducer?

### Takeaway
Use **`useReducer`** for the combined habit list + filter + sort state. Multiple related state values that update together — SET_HABITS, ADD_HABIT, DELETE_HABIT, SET_FILTER, SET_SORT — fit a reducer better than 6+ separate `useState` calls.

### Cited Findings
- "Once you run into more complex state objects or state transitions — which you want to keep maintainable and predictable — the useReducer hook is a great candidate." — [Robin Wieruch: useReducer, useState, useContext](https://www.robinwieruch.de/react-state-usereducer-usestate-usecontext/)
- Prefer `useReducer` if you have "JavaScript objects or arrays as state", "complicated business logic more suitable for a reducer function", or "different properties tied together that should be managed in one state object" — [Saeloun Blog: useState vs useReducer](https://blog.saeloun.com/2023/03/30/when-to-use-useState-vs-useReducer/)
- tkdodo's rule: "State that updates together should live together"; use `useReducer` "for state where user interactions update different parts of the state" — [tkdodo: useState vs useReducer](https://tkdodo.eu/blog/use-state-vs-use-reducer)
- For a todo list with filter functionality, `useState` may not be enough when "multiple state variables need to be updated together or with complex logic" — [Shefali Dev: useReducer hook explained](https://shefali.dev/react-usereducer-hook-explained-when-to-use-it-over-usestate/)

### Inferences
- The current `main.js` reads filter values from DOM and sort values from localStorage separately; in React, all of these become state. A single reducer handles them coherently and avoids stale-closure bugs that arise when multiple `useState` setters are called in sequence.

### Recommended reducer shape:

```js
// src/reducers/habitsReducer.js
const initialState = {
  habits: [],           // raw list from API
  filter: {
    category: '',
    dateFrom: '',
    dateTo: '',
  },
  sort: loadSort(),     // { field: 'name', dir: 'asc' } — reads from localStorage on init
  loading: false,
  error: null,
};

function habitsReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_HABITS':
      return { ...state, habits: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.payload] };
    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter(h => h._id !== action.payload) };
    case 'UPDATE_HABIT':
      return { ...state, habits: state.habits.map(h => h._id === action.payload._id ? action.payload : h) };
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } };
    case 'SET_SORT':
      return { ...state, sort: action.payload };
    case 'CLEAR_FILTER':
      return { ...state, filter: { category: '', dateFrom: '', dateTo: '' } };
    default:
      return state;
  }
}
```

The `useHabits` hook (Question 1) dispatches these actions; components only call the hook's returned action functions, never `dispatch` directly.

### Gaps
- The Saeloun and tkdodo articles do not address the loading/error flags within the same reducer vs as separate `useState` calls; both are valid, but keeping them in the reducer avoids the common bug of `setLoading(false)` being called before `setError()` in a catch block.

---

## Key Question 4: What is the loading/error state pattern for async API calls?

### Takeaway
Use three co-located state fields — `loading` (boolean), `error` (string or null), and `data` — managed together; wrap every async call in a try/catch/finally block, setting `loading: true` before the call and `loading: false` in `finally`. Placing these in the `habitsReducer` (see Question 3) is cleaner than separate `useState` calls.

### Cited Findings
- A `useData` hook managing three state values — `data` (initially null), `isLoading` (initially false), `error` (initially null) — with a `fetchData` callback that updates all three is widely recommended — [DEV Community: Handle API calling process with custom React hooks](https://dev.to/quannh25595/handle-api-calling-process-with-custom-react-hooks-1fk9)
- Good error and loading management "prevents redundant code, reduces debugging time, and encourages consistent patterns across components" — [C# Corner: Best Practices for Handling API Errors and Loading States in React](https://www.c-sharpcorner.com/article/best-practices-for-handling-api-errors-and-loading-states-in-react/)
- Using a generic `AsyncState` type with distinct states `idle | loading | success | error` provides a more advanced pattern, but for this project (JS, no TypeScript) the three-field boolean approach is sufficient — [Money Forward Dev Blog: Managing Asynchronous Loading States with React Hooks](https://global.moneyforward-dev.jp/2025/02/14/managing-asynchronous-loading-states-with-react-hooks/)

### Inferences
- Every action handler in `useHabits` should follow this template:
  ```js
  const refresh = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await getHabits(token);
      dispatch({ type: 'SET_HABITS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
    // 'finally' not needed if SET_HABITS and SET_ERROR both set loading:false in reducer
  }, [token, dispatch]);
  ```
- Resetting `error` to null at the start of each new request (see `SET_LOADING` case) prevents stale errors appearing while a new fetch is in flight.

### Gaps
- No source addressed the exact position of `finally` vs reducer-controlled `loading:false`; both patterns are valid and the distinction is minor.

---

## Key Question 5: How does checkInHabit's optimistic UI pattern translate from the current localHabitsCache approach?

### Takeaway
Replace the stale `localHabitsCache` pattern with a **dual-state optimistic update**: immediately dispatch `UPDATE_HABIT` with the new `completedDates`, then call the API; on failure, dispatch `UPDATE_HABIT` again to restore the previous value (rollback). This keeps the UI instant while the network is in flight.

### Cited Findings
- The core optimistic UI pattern maintains two states — "Actual State (source of truth, in sync with server)" and "Optimistic State (temporary, instantly shown)" — and on server failure performs a rollback: "If the server request fails, perform a rollback, and return UI the actual state" — [freeCodeCamp: How to Use the Optimistic UI Pattern with the useOptimistic() Hook in React](https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/)
- React 19 introduced `useOptimistic` which handles this automatically; React 18 (this project's target) requires the manual pattern — [React docs: useOptimistic](https://www.react.dev/reference/react/useOptimistic)
- "Rollback is the heart of optimistic UI, and omitting the rollback logic will cause adverse consequences" — [freeCodeCamp article above](https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/)

### Inferences
- The current `checkInHabit` reads from `localHabitsCache` (a module-level array) to build `completedDates`. In React, the `habits` array in the reducer replaces that cache — no separate cache needed.
- The `checkIn` action in `useHabits` should:
  1. Save the previous habit state.
  2. Immediately dispatch `UPDATE_HABIT` with optimistic completedDates (previous + today).
  3. Call `checkInHabit(id, token)` from the API module.
  4. On success, dispatch `UPDATE_HABIT` with the server's returned habit (canonical truth).
  5. On failure, dispatch `UPDATE_HABIT` with the saved previous state (rollback).

### Recommended pattern:

```js
const checkIn = useCallback(async (id) => {
  const today = new Date().toISOString().slice(0, 10);
  const prev = state.habits.find(h => h._id === id);
  if (!prev) return;

  // 1. Optimistic update
  dispatch({ type: 'UPDATE_HABIT', payload: {
    ...prev,
    completedDates: [...prev.completedDates, today]
  }});

  try {
    // 2. Real API call
    const updated = await checkInHabit(id, token);
    // 3. Confirm with server truth
    dispatch({ type: 'UPDATE_HABIT', payload: updated });
  } catch (e) {
    // 4. Rollback
    dispatch({ type: 'UPDATE_HABIT', payload: prev });
    dispatch({ type: 'SET_ERROR', payload: 'Check-in failed. Please try again.' });
  }
}, [state.habits, token, dispatch]);
```

### Gaps
- No source specifically addressed check-in optimistic updates for a habit tracker; the pattern above is derived from the general optimistic UI guidance and directly maps the existing `localHabitsCache` logic.

---

## Key Question 6: How should filter values and sort values be stored?

### Takeaway
Store **filter values (category, dateFrom, dateTo) in component state** (inside the reducer), not in the URL or localStorage — they are session-transient and not meant to be shared. Store **sort values in both the reducer state AND localStorage** using the existing `SORT_KEY = 'habitTracker.sort'` key, preserving the current persistence behaviour. URL search params are the right choice only if filter shareability becomes a requirement.

### Cited Findings
- Use component state when "the state is temporary and UI-specific (e.g., form input before submission)" or when "storing state in the URL is unnecessary for sharing or navigation" — [Oscar Bustos: The URL is a Great Place to Store State in React](https://oscarbustos.dev/blog/react-url-state-management/)
- Use localStorage when "state should persist across sessions but not be visible in the URL" and "data should not be lost on refresh but is not meant for sharing" — [Oscar Bustos article above](https://oscarbustos.dev/blog/react-url-state-management/)
- "For shareable views, use the URL; for sensitive persistent state use the backend; for preferences and themes use localStorage" — same source
- URL search params offer "state persistence across page reloads" and "easily shareable" views, but are "hard to scale for large amounts of state" and require additional parsing since "URL parameters are typically strings" — [LogRocket: URL state and useSearchParams](https://blog.logrocket.com/url-state-usesearchparams/)

### Inferences
- Filters are session-transient in the current vanilla JS app (cleared on refresh, `FILTER_IDS` are just form inputs). Keeping them in the reducer state matches that behaviour exactly — no migration surprise.
- Sort is explicitly persisted to `localStorage` in `main.js` under `SORT_KEY`. The React migration must preserve this: on `SET_SORT` reducer action, also call `localStorage.setItem(SORT_KEY, JSON.stringify(action.payload))`. The `initialState.sort` should be initialised by calling `loadSort()` (which reads from localStorage) — the same function already exists in `filter.js`/`main.js`.
- If URL-based filters are added later, React Router's `useSearchParams` (which "behaves much like useState, but stores values directly in the URL") would be the appropriate upgrade path — [LogRocket article above](https://blog.logrocket.com/url-state-usesearchparams/).

### Recommended sort side-effect pattern (inside useHabits or a useEffect):

```js
// Inside habitsReducer or useHabits — persist sort to localStorage on every SET_SORT
case 'SET_SORT':
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(action.payload));
  } catch {}
  return { ...state, sort: action.payload };
```

Alternatively, wrap `dispatch` in a custom `dispatchWithSideEffects` function in `useHabits` that intercepts `SET_SORT` and writes to localStorage before delegating to the real `dispatch`. The reducer-side approach is simpler and keeps the side effect co-located with the state change.

### Gaps
- No source provided guidance on localStorage side effects inside a `useReducer` reducer function. Calling `localStorage.setItem` inside a reducer is technically a side effect and violates the pure-reducer contract; the safer alternative is a `useEffect` that watches `state.sort` and writes to localStorage. Both patterns work in React 18; the `useEffect` approach is more correct.

```js
// Correct: side effect in useEffect, not in reducer
useEffect(() => {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(state.sort));
  } catch {}
}, [state.sort]);
```

---

## Summary: Recommended Architecture

| Concern | Recommendation |
|---|---|
| API functions | Plain async functions in `src/api/*.js`; accept `token` as a parameter |
| Auth token | `AuthContext` (React state) + localStorage mirror under `'habitTracker.token'` |
| Habits list + loading/error | `useReducer` in `useHabits` hook |
| Filter state | `filter` sub-object inside the reducer; no URL params, no localStorage |
| Sort state | `sort` sub-object in reducer, persisted to localStorage via `useEffect`, init from `loadSort()` |
| Optimistic check-in | Immediate `UPDATE_HABIT` dispatch, API call, server-confirm or rollback dispatch |
| Pure filter/sort functions | Keep `filterHabits()` and `sortHabits()` from `filter.js` as-is; import them into the hook/component that renders the list |
