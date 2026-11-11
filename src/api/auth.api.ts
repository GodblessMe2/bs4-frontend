import apiClient from './client';

export interface AdminLoginPayload {
  email: string;
  password?: string;
}

export interface AuthUserResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    isGuest?: boolean;
  };
}

export interface SavedAddressItem {
  id?: string;
  label?: string;
  recipientName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export const authApi = {
  // Admin Login
  adminLogin: async (credentials: AdminLoginPayload): Promise<AuthUserResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthUserResponse }>('/auth/admin-login', credentials);
    return res.data.data;
  },

  // Check if customer email exists
  checkEmail: async (email: string): Promise<{ exists: boolean; isRegistered: boolean; hasOrderHistory: boolean }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { exists: boolean; isRegistered: boolean; hasOrderHistory: boolean };
    }>('/auth/check-email', {
      params: { email },
    });
    return res.data.data;
  },

  // Customer registration
  register: async (payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<AuthUserResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthUserResponse }>('/auth/register', payload);
    return res.data.data;
  },

  // Customer login
  login: async (payload: { email: string; password: string }): Promise<AuthUserResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthUserResponse }>('/auth/login', payload);
    return res.data.data;
  },

  // Get authenticated customer profile
  getProfile: async (): Promise<any> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  // Get saved delivery addresses
  getAddresses: async (): Promise<SavedAddressItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: SavedAddressItem[] }>('/auth/addresses');
    return res.data.data || [];
  },

  // Save a delivery address (max 3 per customer)
  saveAddress: async (address: SavedAddressItem): Promise<SavedAddressItem> => {
    const res = await apiClient.post<{ success: boolean; data: SavedAddressItem }>('/auth/addresses', address);
    return res.data.data;
  },

  // Update a saved delivery address
  updateAddress: async (id: string, address: Partial<SavedAddressItem>): Promise<SavedAddressItem> => {
    const res = await apiClient.put<{ success: boolean; data: SavedAddressItem }>(`/auth/addresses/${id}`, address);
    return res.data.data;
  },

  // Delete a saved delivery address
  deleteAddress: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/addresses/${id}`);
  },

  // Password reset request
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
    return { message: res.data.message };
  },

  // Reset password using email token
  resetPassword: async (payload: { email: string; token: string; password: string }): Promise<{ message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', payload);
    return { message: res.data.message };
  },

  // Logout utilities
  logoutCustomer: () => {
    localStorage.removeItem('bs4_token');
    localStorage.removeItem('bs4_user');
  },

  logoutAdmin: () => {
    localStorage.removeItem('bs4_admin_token');
    localStorage.removeItem('bs4_admin_user');
  },
};
