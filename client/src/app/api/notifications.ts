/** Typed transport facade for notification inbox operations. */
import apiClient from './client';
import type { Notification } from '../types';

export interface NotificationPage {
  notifications: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

export const notificationsApi = {
  getNotifications: (page = 1) => apiClient.get<NotificationPage>(`/notifications?page=${page}`),
  markNotificationRead: (id: string) => apiClient.put<{ notification: Notification }>(`/notifications/${id}/read`),
  markAllNotificationsRead: () => apiClient.put<{ message: string }>('/notifications/read-all'),
};
