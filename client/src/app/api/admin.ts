import apiClient from './client';

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  updateUserStatus: (id, is_active) => apiClient.put(`/admin/users/${id}/status`, { is_active }),
  getClinics: (params) => apiClient.get('/admin/clinics', { params }),
  getPendingReviews: (params) => apiClient.get('/admin/reviews/pending', { params }),
  approveReview: (id) => apiClient.put(`/admin/reviews/${id}/approve`),
  getSubscriptions: (params) => apiClient.get('/admin/subscriptions', { params }),
};
