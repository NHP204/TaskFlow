import api from './api.js';

const data = (res) => res.data;

export const workspaceService = {
  list: () => api.get('/workspaces').then(data),
  get: (id) => api.get(`/workspaces/${id}`).then(data),
  create: (body) => api.post('/workspaces', body).then(data),
  update: (id, body) => api.patch(`/workspaces/${id}`, body).then(data),
  remove: (id) => api.delete(`/workspaces/${id}`),
  stats: (id) => api.get(`/workspaces/${id}/stats`).then(data),

  addMember: (id, body) => api.post(`/workspaces/${id}/members`, body).then(data),
  updateMemberRole: (id, userId, role) =>
    api.patch(`/workspaces/${id}/members/${userId}`, { role }).then(data),
  removeMember: (id, userId) => api.delete(`/workspaces/${id}/members/${userId}`),
};
