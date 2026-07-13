import apiClient from './client';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => apiClient.post('/auth/reset-password', { token, password }),
  getNotifications: (page = 1) => apiClient.get(`/auth/notifications?page=${page}`),
  markNotificationRead: (id) => apiClient.put(`/auth/notifications/${id}/read`),
};

export const setAuthToken = (token, user) => {
  if (token) {
    localStorage.setItem('clinic_os_token', token);
    localStorage.setItem('clinic_os_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('clinic_os_token');
    localStorage.removeItem('clinic_os_user');
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('clinic_os_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem('clinic_os_token');

export const isAuthenticated = () => !!getStoredToken();
