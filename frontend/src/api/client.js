const API_BASE = '';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem('user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (username, password) =>
    request('/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),

  login: (username, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  searchUsers: (q) =>
    request(`/users/search?q=${encodeURIComponent(q)}`),

  getLists: () =>
    request('/lists'),

  createList: (name, type) =>
    request('/lists', { method: 'POST', body: JSON.stringify({ name, type }) }),

  getList: (id) =>
    request(`/lists/${id}`),

  shareList: (listId, username) =>
    request(`/lists/${listId}/share`, { method: 'POST', body: JSON.stringify({ username }) }),

  removeMember: (listId, userId) =>
    request(`/lists/${listId}/members/${userId}`, { method: 'DELETE' }),

  deleteList: (id) =>
    request(`/lists/${id}`, { method: 'DELETE' }),

  addTask: (listId, task) =>
    request(`/lists/${listId}/tasks`, { method: 'POST', body: JSON.stringify({ task }) }),

  updateTask: (taskId, updates) =>
    request(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, { method: 'DELETE' }),
};
