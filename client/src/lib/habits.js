// client/src/lib/habits.js
// Habit and category API functions. Each accepts a token parameter
// instead of reading from localStorage directly.

const API_BASE = '/api/habits';
const CATEGORIES_API_BASE = '/api/categories';

/**
 * Build Authorization header object when a token is provided.
 * @param {string|null} token
 * @param {object} extra  Additional headers to merge in.
 * @returns {object}
 */
function authHeaders(token, extra = {}) {
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/**
 * Fetch all habits for the authenticated user.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getHabits(token) {
  const res = await fetch(API_BASE, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch habits');
  }

  return res.json();
}

/**
 * Create a new habit.
 * @param {string} name
 * @param {string} category
 * @param {string} frequency
 * @param {number|null} dayOfMonth
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addHabit(name, category, frequency, dayOfMonth, token) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, category, frequency, dayOfMonth }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to add habit');
  }

  return res.json();
}

/**
 * Delete a habit by id.
 * @param {string} id
 * @param {string} token
 * @returns {Promise<true>}
 */
export async function deleteHabit(id, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete habit');
  }

  return true;
}

/**
 * Update a habit's fields.
 * @param {string} id
 * @param {object} fields  Any updatable fields (e.g. { frequency, name }).
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateHabit(id, fields, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update habit');
  }

  return res.json();
}

/**
 * Check in a habit (record completed dates).
 * @param {string} id
 * @param {string[]} completedDates  Full updated array of ISO date strings.
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function checkInHabit(id, completedDates, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ completedDates }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to check in habit');
  }

  return res.json();
}

/**
 * Toggle the paused state of a habit.
 * @param {string} id
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function pauseHabit(id, token) {
  const res = await fetch(`${API_BASE}/${id}/pause`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to toggle pause');
  }

  return res.json();
}

/**
 * Fetch all categories.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCategories(token) {
  const res = await fetch(CATEGORIES_API_BASE, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch categories');
  }

  return res.json();
}

/**
 * Create a new category.
 * @param {string} name
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addCategory(name, token) {
  const res = await fetch(CATEGORIES_API_BASE, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to add category');
  }

  return res.json();
}
