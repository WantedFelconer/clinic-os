import apiClient from './client';

export const messagesApi = {
  sendMessage: (data: { sender_id?: string; receiver_id: string; subject?: string; message: string }) =>
    apiClient.post('/messages', data),
  getMyMessages: () => apiClient.get('/messages/my'),
  getRecipients: () => apiClient.get('/messages/recipients'),
  markAsRead: (id: string) => apiClient.put(`/messages/${id}/read`),
};
