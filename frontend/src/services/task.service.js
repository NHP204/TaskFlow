import api from './api.js';

const data = (res) => res.data;
const page = (res) => ({ items: res.data, meta: res.meta });

export const taskService = {
  list: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }).then(page),
  get: (id) => api.get(`/tasks/${id}`).then(data),
  create: (body) => api.post('/tasks', body).then(data),
  update: (id, body) => api.patch(`/tasks/${id}`, body).then(data),
  remove: (id) => api.delete(`/tasks/${id}`),
  activity: (id, params) => api.get(`/tasks/${id}/activity`, { params }).then(page),
};
