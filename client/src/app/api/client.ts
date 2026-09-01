import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ApiErrorResponse {
  message?: string;
  errors?: Array<{ field?: string; msg?: string; message?: string }>;
  required_feature?: string;
  current_plan?: string;
}

/**
 * Extracts a normalized, user-friendly error message from an Axios response.
 */
export function getApiErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.message) {
      return data.message;
    }
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map(e => e.msg || e.message || 'Validation error').join(', ');
    }
    if (error.response?.status === 401) {
      return 'Session expired. Please log in again.';
    }
    if (error.response?.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.response?.status === 409) {
      return 'A scheduling or resource conflict occurred. Please refresh and try again.';
    }
    if (error.response?.status === 500) {
      return 'Internal server error. Please contact technical support if the issue persists.';
    }
    if (error.message && error.message.includes('Network Error')) {
      return 'Unable to connect to the backend server. Please verify your connection.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_os_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      error.response = {
        data: { message: 'Unable to connect to backend server. Please verify the API service is running.' },
        status: 0,
        statusText: 'Network Error',
        headers: {},
        config: error.config || ({} as any),
      };
    } else if (error.response.status === 401) {
      localStorage.removeItem('clinic_os_token');
      localStorage.removeItem('clinic_os_user');
      localStorage.removeItem('clinic_os_clinic_id');
      // Dispatch an authentication expiration event for graceful UI transition
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
