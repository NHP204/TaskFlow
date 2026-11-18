import axios from 'axios';

// Auth is an httpOnly cookie: the browser attaches it, JavaScript never sees the token.
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 15000,
});

let handleUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

api.interceptors.response.use(
  // Unwrap the { success, data, message, meta } envelope.
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default api;
