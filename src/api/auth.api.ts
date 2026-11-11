import apiClient from './client';

export interface AdminLoginPayload {
  email: string;
  password?: string;
}

export interface AdminLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export const authApi = {
  // Admin Login
  adminLogin: async (credentials: AdminLoginPayload): Promise<{ token: string; user: any }> => {
    const res = await apiClient.post<{ success: boolean; data: AdminLoginResponse }>('/auth/admin-login', credentials);
    return res.data.data;
  },

  // Check if customer email exists
  checkEmail: async (email: string): Promise<{ exists: boolean }> => {
    const res = await apiClient.get<{ success: boolean; exists: boolean }>('/auth/check-email', {
      params: { email },
    });
    return res.data;
  },

  // Customer registration
  register: async (payload: any): Promise<any> => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  // Customer login
  login: async (payload: any): Promise<any> => {
    const res = await apiClient.post('/auth/login', payload);
    return res.data;
  },

  // Logout utility
  logoutAdmin: () => {
    localStorage.removeItem('bs4_admin_token');
    localStorage.removeItem('bs4_admin_user');
  },
};
