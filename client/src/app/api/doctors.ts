import apiClient from './client';

export interface DoctorProfileData {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  qualifications?: string;
  specialization?: string;
  experience_years?: number;
  consultation_fee?: number;
  bio?: string;
  avg_rating?: number;
  reviews_count?: number;
  clinics?: Array<{
    id: string;
    name: string;
    slug?: string;
    city?: string;
    address?: string;
  }>;
}

export const doctorsApi = {
  search: async (params?: { query?: string; specialty?: string; city?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/doctors/search', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/doctors/${id}`);
    return res.data;
  },

  getMyProfile: async () => {
    const res = await apiClient.get('/doctors/me/profile');
    return res.data;
  },

  updateMyProfile: async (data: Partial<DoctorProfileData>) => {
    const res = await apiClient.put('/doctors/me/profile', data);
    return res.data;
  },

  getReviews: async (id: string, params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get(`/doctors/${id}/reviews`, { params });
    return res.data;
  },
};
