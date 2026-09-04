import apiClient from './client';

export const subscriptionsApi = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  subscribe: (clinicId: string, plan_id: string, billing_cycle?: string) =>
    apiClient.post(`/clinics/${clinicId}/subscriptions/subscribe`, { plan_id, billing_cycle }),
  getMySubscription: (clinicId: string) => apiClient.get(`/clinics/${clinicId}/subscriptions/my`),
  getLimits: (clinicId: string) => apiClient.get(`/clinics/${clinicId}/subscriptions/limits`),
  cancelSubscription: (clinicId: string) => apiClient.post(`/clinics/${clinicId}/subscriptions/cancel`),
  renewSubscription: (clinicId: string) => apiClient.post(`/clinics/${clinicId}/subscriptions/renew`),
};
