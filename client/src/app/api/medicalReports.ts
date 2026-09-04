import apiClient from './client';

export const medicalReportsApi = {
  create: (clinicId: string, data: any) => apiClient.post(`/clinics/${clinicId}/medical-reports`, data),
  getByPatient: (clinicId: string, patientId: string) => apiClient.get(`/clinics/${clinicId}/medical-reports/patient/${patientId}`),
};
