import apiClient from './client';

export interface PriceCalculationPayload {
  pageCount: number;
  copies?: number;
  paperSize?: string;
  paperWeight?: string;
  colorMode?: string;
  printSides?: string;
  pagesPerSheet?: number;
  bindingType?: string;
  frontCover?: string;
  backCover?: string;
  shippingMethod?: string;
  couponDiscount?: number;
}

export interface PriceTierItem {
  id: string;
  category: string;
  subCategory: string;
  displayName: string;
  unit: string;
  minQty: number;
  maxQty: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  requiresQuote: boolean;
  notes?: string;
  isActive: boolean;
}

export interface PriceTierQueryParams {
  category?: string;
  search?: string;
  requiresQuote?: boolean;
  isActive?: boolean;
}

export const pricingApi = {
  // Calculate price dynamically based on print options
  calculate: async (payload: PriceCalculationPayload): Promise<any> => {
    const res = await apiClient.post('/pricing/calculate', payload);
    return res.data.data;
  },

  // Get full official 2026 recommended retail price list
  getFullPriceList: async (): Promise<any> => {
    const res = await apiClient.get('/pricing/full-list');
    return res.data.data;
  },

  // Query database price tiers with filters
  queryTiers: async (params?: PriceTierQueryParams): Promise<PriceTierItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: PriceTierItem[]; count: number }>('/pricing/tiers', {
      params,
    });
    return res.data.data;
  },

  // Update existing price tier in database
  updateTier: async (id: string, updates: Partial<PriceTierItem>): Promise<PriceTierItem> => {
    const res = await apiClient.put<{ success: boolean; data: PriceTierItem }>(`/pricing/tiers/${id}`, updates);
    return res.data.data;
  },

  // Create new price tier in database
  createTier: async (data: Partial<PriceTierItem>): Promise<PriceTierItem> => {
    const res = await apiClient.post<{ success: boolean; data: PriceTierItem }>('/pricing/tiers', data);
    return res.data.data;
  },

  // Delete price tier
  deleteTier: async (id: string): Promise<boolean> => {
    const res = await apiClient.delete<{ success: boolean }>(`/pricing/tiers/${id}`);
    return res.data.success;
  },

  // Reset database tiers to official 2026 defaults
  resetToDefault: async (): Promise<{ count: number; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string; data: { count: number } }>(
      '/pricing/tiers/reset-default'
    );
    return { count: res.data.data.count, message: res.data.message };
  },
};
