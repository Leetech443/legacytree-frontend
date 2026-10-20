// All network calls (including the functions that save data) live here.
const API_BASE = (window.APP_CONFIG?.API_BASE || '').replace(/\/$/, '');

export const auth = {
  get token() { return sessionStorage.getItem('adminToken') || ''; },
  set(t) { sessionStorage.setItem('adminToken', t); },
  clear() { sessionStorage.removeItem('adminToken'); },
};

async function request(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || 'Request failed');
    e.status = res.status; e.details = data.details;
    throw e;
  }
  return data;
}

/* ---- Public ---- */
let optionsCache;
export const getOptions = () => (optionsCache ??= request('/options'));
export const getParents = (generation, gender = '') => request(`/parents?for=${generation}&gender=${gender}`);
/** Saves a new person + their RSVP in one request. */
export const registerMember = (payload) => request('/register', { method: 'POST', body: payload });
/** Lets a person change their answer later using the token returned by registerMember. */
export const updateRsvp = (token, rsvp) => request(`/rsvp/${token}`, { method: 'PUT', body: rsvp });

/** Family tree data (admin-only unless the server has TREE_PUBLIC=true). */
export const getTree = () => request('/tree');

/* ---- Admin ---- */
export const adminApi = {
  login: (username, password) => request('/admin/login', { method: 'POST', body: { username, password } }),
  overview: () => request('/admin/overview'),
  members: () => request('/admin/members'),
  deleteMember: (id) => request(`/admin/members/${id}`, { method: 'DELETE' }),
  followups: () => request('/admin/followups'),
  completeFollowup: (id) => request(`/admin/followups/${id}/done`, { method: 'POST' }),
  parents: () => request('/admin/parents'),
  addParent: (p) => request('/admin/parents', { method: 'POST', body: p }),
  exportCsv: async () => {
    const blob = await (await request('/admin/export.csv', { raw: true })).blob();
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'rsvps.csv' });
    a.click();
  },
};
