import apiClient from './client';

export const reviewsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/reviews`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/reviews`, data),
  approve: (clinicId, id) => apiClient.put(`/clinics/${clinicId}/reviews/${id}/approve`),
  remove: (clinicId, id) => apiClient.delete(`/clinics/${clinicId}/reviews/${id}`),
};
