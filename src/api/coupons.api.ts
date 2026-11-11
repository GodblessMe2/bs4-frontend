import apiClient from './client';

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  usageCount?: number;
  isActive: boolean;
}

export interface CreateCouponPayload {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  isActive?: boolean;
}

export const couponsApi = {
  // Validate coupon at checkout / in copy shop
  validate: async (code: string, orderAmount: number): Promise<{ valid: boolean; discountAmount: number; coupon?: CouponItem; message?: string }> => {
    const res = await apiClient.post('/coupons/validate', { code, orderAmount });
    return res.data;
  },

  // Admin lists coupons
  listAdminCoupons: async (): Promise<CouponItem[]> => {
    const res = await apiClient.get<{ success: boolean; data: CouponItem[] }>('/coupons/admin');
    return res.data.data || [];
  },

  // Admin creates coupon
  createCoupon: async (payload: CreateCouponPayload): Promise<CouponItem> => {
    const res = await apiClient.post<{ success: boolean; data: CouponItem }>('/coupons/admin', payload);
    return res.data.data;
  },
};
