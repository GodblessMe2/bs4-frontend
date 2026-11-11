import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Base API configuration with environment variable support & fallback to relative proxy '/api'
const BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach authentication tokens cleanly based on route context
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const adminToken = localStorage.getItem('bs4_admin_token');
    const customerToken = localStorage.getItem('bs4_token');
    const url = config.url || '';
    const isAdminContext =
      window.location.pathname.startsWith('/admin') ||
      url.startsWith('/admin') ||
      url.includes('/admin/');

    const token = isAdminContext ? adminToken : customerToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Uniform error handling & 401 handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<any>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    // If unauthorized admin request, redirect to login if appropriate
    if (status === 401 && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
      localStorage.removeItem('bs4_admin_token');
      localStorage.removeItem('bs4_admin_user');
      window.location.href = '/admin/login';
    }

    // Attach human-readable message to error object for clean UI handling
    const customError = new Error(message);
    (customError as any).status = status;
    (customError as any).data = error.response?.data;
    return Promise.reject(customError);
  }
);

export default apiClient;
