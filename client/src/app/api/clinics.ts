import apiClient from './client';

export const clinicsApi = {
  search: (params) => apiClient.get('/clinics/search', { params }),
  getById: (id) => apiClient.get(`/clinics/${id}`),
  getMyClinics: () => apiClient.get('/clinics'),
  create: (data) => apiClient.post('/clinics', data),
  update: (id, data) => apiClient.put(`/clinics/${id}`, data),
  updateBranding: (id, data: { logo_url?: string | null; banner_url?: string | null }) =>
    apiClient.patch(`/clinics/${id}/branding`, data),
  getDashboard: (clinicId) => apiClient.get(`/clinics/${clinicId}/dashboard`),
  getAnalytics: (clinicId) => apiClient.get(`/clinics/${clinicId}/analytics`),
  getSchedules: (clinicId) => apiClient.get(`/clinics/${clinicId}/schedules`),
  getAvailableSlots: (clinicId, params) => apiClient.get(`/clinics/${clinicId}/available-slots`, { params }),
  updateSchedules: (clinicId, schedules) => apiClient.put(`/clinics/${clinicId}/schedules`, { schedules }),
  getStaff: (clinicId) => apiClient.get(`/clinics/${clinicId}/staff`),
  addStaff: (clinicId, email, role) => apiClient.post(`/clinics/${clinicId}/staff`, { email, role }),
  removeStaff: (clinicId, userId) => apiClient.delete(`/clinics/${clinicId}/staff/${userId}`),
  getServices: (clinicId) => apiClient.get(`/clinics/${clinicId}/services`),
  createService: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/services`, data),
  updateService: (clinicId, serviceId, data) => apiClient.put(`/clinics/${clinicId}/services/${serviceId}`, data),
  deleteService: (clinicId, serviceId) => apiClient.delete(`/clinics/${clinicId}/services/${serviceId}`),
  getPackages: (clinicId) => apiClient.get(`/clinics/${clinicId}/packages`),
  createPackage: (clinicId, data) => apiClient.post(`/clinics/${clinicId}/packages`, data),
  updatePackage: (clinicId, packageId, data) => apiClient.put(`/clinics/${clinicId}/packages/${packageId}`, data),
  deletePackage: (clinicId, packageId) => apiClient.delete(`/clinics/${clinicId}/packages/${packageId}`),
};
