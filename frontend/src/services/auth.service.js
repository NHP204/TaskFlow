import api from './api.js';

export const authService = {
  me: () => api.get('/auth/me').then((res) => res.data),
  login: (credentials) => api.post('/auth/login', credentials).then((res) => res.data.user),
  register: (data) => api.post('/auth/register', data).then((res) => res.data.user),
  logout: () => api.post('/auth/logout'),
};
