import apiClient from './client';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  verifyOTP: (email, otp) => apiClient.post('/auth/verify-otp', { email, otp }),
  resendOTP: (email) => apiClient.post('/auth/resend-otp', { email }),
  login: (data) => apiClient.post('/auth/login', data),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => apiClient.post('/auth/reset-password', { token, password }),
  getPatientProfile: () => apiClient.get('/auth/patient-profile'),
  getMyAppointments: (page = 1) => apiClient.get(`/auth/appointments?page=${page}`),
  getMedicalRecords: (page = 1) => apiClient.get(`/auth/medical-records?page=${page}`),
  getPrescriptions: (page = 1) => apiClient.get(`/auth/prescriptions?page=${page}`),
  getMyPayments: (page = 1) => apiClient.get(`/auth/payments?page=${page}`),
  getNotifications: (page = 1) => apiClient.get(`/auth/notifications?page=${page}`),
  markNotificationRead: (id) => apiClient.put(`/auth/notifications/${id}/read`),
  markAllNotificationsRead: () => apiClient.put('/auth/notifications/read-all'),
};

export const patientApi = {
  getMyAppointments: (clinicId?: string, page = 1) =>
    clinicId && clinicId !== '0' && clinicId !== 'undefined'
      ? apiClient.get(`/clinics/${clinicId}/appointments/my?page=${page}`)
      : apiClient.get(`/auth/appointments?page=${page}`),
  getMyPayments: (clinicId?: string, page = 1) =>
    clinicId && clinicId !== '0' && clinicId !== 'undefined'
      ? apiClient.get(`/clinics/${clinicId}/payments/my?page=${page}`)
      : apiClient.get(`/auth/payments?page=${page}`),
};

export const setAuthToken = (token, user) => {
  if (token) {
    localStorage.setItem('clinic_os_token', token);
    localStorage.setItem('clinic_os_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('clinic_os_token');
    localStorage.removeItem('clinic_os_user');
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('clinic_os_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem('clinic_os_token');

export const isAuthenticated = () => !!getStoredToken();
