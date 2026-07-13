import apiClient from './client';

export const subscriptionsApi = {
  getPlans: () => apiClient.get('/clinics/0/subscriptions/plans'),
  subscribe: (clinicId, plan_id, billing_cycle) =>
    apiClient.post(`/clinics/${clinicId}/subscriptions/subscribe`, { plan_id, billing_cycle }),
  getMySubscription: (clinicId) => apiClient.get(`/clinics/${clinicId}/subscriptions/my`),
  cancelSubscription: (clinicId) => apiClient.post(`/clinics/${clinicId}/subscriptions/cancel`),
};
