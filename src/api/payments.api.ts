import apiClient from './client';

export interface PublicPaymentConfig {
  stripeEnabled: boolean;
  stripeLiveElements: boolean;
  stripePublishableKey: string | null;
  stripeMode: 'test' | 'live';
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalMode: 'sandbox' | 'live';
}

export const paymentsApi = {
  getConfig: async (): Promise<PublicPaymentConfig> => {
    const res = await apiClient.get('/payments/config');
    return res.data.data;
  },

  createStripeIntent: async (orderId: string): Promise<{
    clientSecret: string | null;
    paymentIntentId: string;
    mode: 'test' | 'live';
    liveElements: boolean;
  }> => {
    const res = await apiClient.post('/payments/stripe/create-intent', { orderId });
    return res.data.data;
  },

  verifyStripePayment: async (payload: {
    orderId: string;
    paymentIntentId?: string;
    cardBrand?: string;
    cardLast4?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    method?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/payments/stripe/verify', payload);
    return res.data.data;
  },

  createPayPalOrder: async (orderId: string): Promise<{
    paypalOrderId: string;
    status: string;
    approvalUrl?: string;
  }> => {
    const res = await apiClient.post('/payments/paypal/create-order', { orderId });
    return res.data.data;
  },

  capturePayPalOrder: async (orderId: string, paypalOrderId: string): Promise<any> => {
    const res = await apiClient.post('/payments/paypal/capture-order', {
      orderId,
      paypalOrderId,
    });
    return res.data.data;
  },
};

