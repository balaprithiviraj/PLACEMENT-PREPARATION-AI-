import axios from 'axios';

export function resolveApiBaseUrl(
  envValue = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined),
  hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
) {
  const configured = (envValue ?? '').trim();
  if (configured) return configured.replace(/\/+$/, '');

  const normalizedHost = (hostname || 'localhost').toLowerCase();
  if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(normalizedHost)) {
    return '/api';
  }
  if (normalizedHost === '0.0.0.0') {
    return 'http://localhost:8000/api';
  }
  return '/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  // Client-side ceiling: backend caps AI generation at 60s (HTTP 504),
  // so abort just after to avoid hung UI on dead connections.
  timeout: 65000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear session and go to login
// 503 (DB_UNAVAILABLE) is NOT logged out — it is transient, so surface the
// backend's retry hint instead. All backend errors now share the shape
// { message, code, details?, hint? } (see backend/src/middleware/errorMiddleware.js).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Extract a human-readable message from any API error, including
// advanced MongoDB errors (VALIDATION_ERROR details, DUPLICATE_KEY,
// INVALID_ID, DB_UNAVAILABLE hint).
export function getErrorMessage(err, fallback = 'Something went wrong') {
  // Client-side timeout (axios ECONNABORTED) — never expose stack/config.
  if (err?.code === 'ECONNABORTED' || /timeout of .* exceeded/i.test(err?.message || '')) {
    return 'Request timed out. Please try again with a smaller set.';
  }
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  const parts = [data.message || data.detail || fallback];
  if (data.details && typeof data.details === 'object' && !Array.isArray(data.details)) {
    const fields = Object.entries(data.details)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    if (fields) parts.push(fields);
  }
  if (data.hint) parts.push(data.hint);
  if (data.code) parts.push(`(${data.code})`);
  return parts.join(' ');
}

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/status`),
};

export const resumeAPI = {
  // NOTE: override Content-Type so the browser sends multipart with boundary.
  upload: (formData) =>
    api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: () => api.get('/resumes'),
  getById: (id) => api.get(`/resumes/${id}`),
  analyze: (id) => api.post(`/resumes/${id}/analyze`),
};

export const questionAPI = {
  list: (params) => api.get('/questions', { params }),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  remove: (id) => api.delete(`/questions/${id}`),
  publish: (id) => api.patch(`/questions/${id}/publish`),
};

export const quizAPI = {
  start: (data) => api.post('/quiz/start', data),
  submit: (data) => api.post('/quiz/submit', data),
  history: () => api.get('/quiz/history'),
  getById: (id) => api.get(`/quiz/${id}`),
  generate: (body) => api.post('/questions/generate', body),
};

// Focused Python/Google AI integration. Generated questions are graded in the
// browser, so the base product only needs this one backend endpoint.
export const questionGeneratorAPI = {
  generate: (data) => api.post('/questions/generate', data),
};

export const interviewAPI = {
  start: (data) => api.post('/interview/start', data),
  submit: (data) => api.post('/interview/submit', data),
  // alias: older name used in some guides; backend route is /interview/submit
  answer: (data) => api.post('/interview/submit', data),
  history: () => api.get('/interview/history'),
  getById: (id) => api.get(`/interview/${id}`),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  categories: () => api.get('/events/categories'),
  get: (id) => api.get(`/events/${id}`),
  register: (id, data = {}) => api.post(`/events/${id}/register`, data),
};

export const registrationsAPI = {
  mine: () => api.get('/registrations/mine'),
  remove: (id) => api.delete(`/registrations/${id}`),
};

export const certificatesAPI = {
  mine: () => api.get('/certificates/mine'),
};

export const studioAPI = {
  // NOTE: do NOT set Content-Type manually — axios adds the multipart boundary.
  generateDesign: (file) => {
    const formData = file instanceof FormData ? file : (() => {
      const fd = new FormData();
      fd.append('file', file);
      return fd;
    })();
    return api.post('/resume-studio/generate-design', formData);
  },
  list: () => api.get('/resume-studio/generated'),
  get: (id) => api.get(`/resume-studio/generated/${id}`),
  remove: (id) => api.delete(`/resume-studio/generated/${id}`),
};

export default api;
