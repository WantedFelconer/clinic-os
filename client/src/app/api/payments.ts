import apiClient from './client';

export const paymentsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/payments`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/payments`, data),
  getById: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/payments/${id}`),
  updateStatus: (clinicId, id, status, transaction_id) =>
    apiClient.put(`/clinics/${clinicId}/payments/${id}/status`, { status, transaction_id }),
  getRevenue: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/payments/revenue`, { params }),
  getMyPayments: (page = 1) => apiClient.get(`/auth/payments?page=${page}`),
};
