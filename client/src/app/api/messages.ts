import apiClient from './client';

export const messagesApi = {
  sendMessage: (data: { receiver_id: string; subject?: string; message: string }) =>
    apiClient.post('/messages', data),
  getMyMessages: () => apiClient.get('/messages/my'),
  markAsRead: (id: string) => apiClient.put(`/messages/${id}/read`),
};
