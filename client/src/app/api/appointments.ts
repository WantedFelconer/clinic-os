import apiClient from './client';

export const appointmentsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/appointments`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/appointments`, data),
  getById: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/appointments/${id}`),
  updateStatus: (clinicId, id, status, cancellation_reason) =>
    apiClient.put(`/clinics/${clinicId}/appointments/${id}/status`, { status, cancellation_reason }),
  reschedule: (clinicId, id, data) =>
    apiClient.put(`/clinics/${clinicId}/appointments/${id}/reschedule`, data),
  getUpcoming: (clinicId) => apiClient.get(`/clinics/${clinicId}/appointments/upcoming`),
  getMyAppointments: (page = 1) => apiClient.get(`/auth/appointments?page=${page}`),
};
