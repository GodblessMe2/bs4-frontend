import apiClient from './client';

export interface SubmitQuotePayload {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceCategory: string;
  quantity: number;
  specifications: any;
  customerNotes?: string;
}

export interface SubmitQuoteResponsePayload {
  quotedAmount: number;
  turnaroundTime: string;
  adminNotes?: string;
}

export const quotesApi = {
  // Customer submits custom quote request
  submitQuoteRequest: async (payload: SubmitQuotePayload): Promise<any> => {
    const res = await apiClient.post('/quotes', payload);
    return res.data.data;
  },

  // Customer or Admin gets quote by unique identifier / quoteNumber
  getQuoteByIdentifier: async (identifier: string): Promise<any> => {
    const res = await apiClient.get(`/quotes/${identifier}`);
    return res.data.data;
  },

  // Admin lists all pending & active quotes
  listAdminQuotes: async (): Promise<any[]> => {
    const res = await apiClient.get('/quotes/admin/list');
    return res.data.data || [];
  },

  // Admin submits official quote with price & turnaround
  submitQuoteResponse: async (quoteId: string, payload: SubmitQuoteResponsePayload): Promise<any> => {
    const res = await apiClient.post(`/quotes/admin/${quoteId}/submit`, payload);
    return res.data.data;
  },
};
