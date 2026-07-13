import apiClient from './client';

export const medicalRecordsApi = {
  getByClinic: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/medical-records`, { params }),
  create: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/medical-records`, data),
  getById: (clinicId, id) => apiClient.get(`/clinics/${clinicId}/medical-records/${id}`),
  update: (clinicId, id, data) => apiClient.put(`/clinics/${clinicId}/medical-records/${id}`, data),
  getByPatient: (clinicId, patientId) => apiClient.get(`/clinics/${clinicId}/medical-records/patient/${patientId}`),
};
