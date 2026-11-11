import apiClient from './client';

export interface CreateOrderPayload {
  quoteId?: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerName?: string;
  customerPhone?: string;
  createAccount?: boolean;
  password?: string;
  shippingMethod: 'standard' | 'express';
  shippingAddress: {
    recipientName: string;
    companyName?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    county?: string;
    postcode: string;
    country?: string;
    phone?: string;
  };
  billingAddress?: any;
  couponCode?: string;
  paymentProvider?: 'stripe' | 'paypal';
  items: Array<{
    jobName: string;
    copies: number;
    fileIds: string[];
    config: any;
  }>;
}

export const ordersApi = {
  // Customer creates order at checkout
  createOrder: async (payload: CreateOrderPayload): Promise<any> => {
    const res = await apiClient.post('/orders', payload);
    return res.data.data;
  },

  // Get order details by order number or ID
  getOrder: async (orderNumber: string): Promise<any> => {
    const res = await apiClient.get(`/orders/${orderNumber}`);
    return res.data.data;
  },

  // Authenticated customer: get own order history
  getMyOrders: async (): Promise<any[]> => {
    const res = await apiClient.get('/orders/my-orders');
    return res.data.data || [];
  },

  // Admin: List all orders with status/search filters
  listAdminOrders: async (params?: { status?: string; search?: string }): Promise<any[]> => {
    const res = await apiClient.get('/admin/orders', { params });
    return res.data.data.orders || [];
  },

  // Admin: Update order status (paid, in_production, printed, dispatched, etc.)
  updateOrderStatus: async (orderId: string, status: string, trackingNumber?: string): Promise<any> => {
    const res = await apiClient.patch(`/admin/orders/${orderId}/status`, { status, trackingNumber });
    return res.data.data;
  },

  // Confirm/complete payment for an order
  confirmPayment: async (orderIdOrNumber: string): Promise<any> => {
    const res = await apiClient.post(`/orders/${orderIdOrNumber}/dev-pay`);
    return res.data.data;
  },
};
