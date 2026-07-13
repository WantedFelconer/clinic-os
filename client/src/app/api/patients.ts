import apiClient from './client';

export const patientsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/patients`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/patients`, data),
  getById: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/patients/${id}`),
  update: (clinicId, id, data) => apiClient.put(`/clinics/${clinicId}/patients/${id}`, data),
};
