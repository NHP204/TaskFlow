import api from './api.js';

export const commentService = {
  list: (taskId, params) =>
    api
      .get(`/tasks/${taskId}/comments`, { params })
      .then((res) => ({ items: res.data, meta: res.meta })),
  create: (taskId, content) =>
    api.post(`/tasks/${taskId}/comments`, { content }).then((res) => res.data),
  update: (id, content) => api.patch(`/comments/${id}`, { content }).then((res) => res.data),
  remove: (id) => api.delete(`/comments/${id}`),
};
