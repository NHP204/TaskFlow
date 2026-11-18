import api from './api.js';

const data = (res) => res.data;

export const projectService = {
  listByWorkspace: (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`).then(data),
  get: (id) => api.get(`/projects/${id}`).then(data),
  create: (body) => api.post('/projects', body).then(data),
  update: (id, body) => api.patch(`/projects/${id}`, body).then(data),
  remove: (id) => api.delete(`/projects/${id}`),
  stats: (id) => api.get(`/projects/${id}/stats`).then(data),
};
