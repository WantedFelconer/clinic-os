import apiClient from './client';

export const prescriptionsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/prescriptions`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/prescriptions`, data),
  update: (clinicId, id, data) => apiClient.put(`/clinics/${clinicId}/prescriptions/${id}`, data),
  getById: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/prescriptions/${id}`),
  downloadPdf: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/prescriptions/${id}/pdf`, { responseType: 'blob' }),
  getByPatient: (clinicId, patientId) => apiClient.get(`/clinics/${clinicId}/prescriptions/patient/${patientId}`),
  addItem: (clinicId, id, data) => apiClient.post(`/clinics/${clinicId}/prescriptions/${id}/items`, data),
  removeItem: (clinicId, id, itemId) => apiClient.delete(`/clinics/${clinicId}/prescriptions/${id}/items/${itemId}`),
};
