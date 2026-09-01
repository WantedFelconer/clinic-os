import apiClient from './client';

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  updateUserStatus: (id: string, is_active: boolean) => apiClient.put(`/admin/users/${id}/status`, { is_active }),
  getClinics: (params?: any) => apiClient.get('/admin/clinics', { params }),
  updateClinicStatus: (id: string, is_active: boolean) => apiClient.put(`/admin/clinics/${id}/status`, { is_active }),
  getPendingReviews: (params?: any) => apiClient.get('/admin/reviews/pending', { params }),
  approveReview: (id: string) => apiClient.put(`/admin/reviews/${id}/approve`),
  rejectReview: (id: string) => apiClient.delete(`/admin/reviews/${id}`),
  getPlans: () => apiClient.get('/admin/plans'),
  createPlan: (data: any) => apiClient.post('/admin/plans', data),
  updatePlan: (id: string, data: any) => apiClient.put(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => apiClient.delete(`/admin/plans/${id}`),
  getSubscriptions: (params?: any) => apiClient.get('/admin/subscriptions', { params }),
  getAuditLogs: (params?: any) => apiClient.get('/admin/audit-logs', { params }),
};
