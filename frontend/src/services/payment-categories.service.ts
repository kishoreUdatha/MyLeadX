/**
 * Payment Categories Service
 * Frontend API service for managing payment categories
 */

import api from './api';

export type PaymentCategoryType = 'FEE' | 'DEPOSIT' | 'REFUND' | 'DISCOUNT' | 'TAX' | 'OTHER';

export interface CategoryRule {
  id: string;
  condition: 'course' | 'branch' | 'student_type' | 'payment_mode';
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
  action: 'apply' | 'skip' | 'modify_amount';
  actionValue?: number;
}

export interface PaymentCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  type: PaymentCategoryType;
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive: boolean;
  isRefundable: boolean;
  isActive: boolean;
  displayOrder: number;
  color?: string;
  rules: CategoryRule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentCategoryInput {
  name: string;
  code: string;
  description?: string;
  type?: PaymentCategoryType;
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  isRefundable?: boolean;
  color?: string;
  rules?: CategoryRule[];
}

export interface UpdatePaymentCategoryInput {
  name?: string;
  code?: string;
  description?: string;
  type?: PaymentCategoryType;
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  isRefundable?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  color?: string;
  rules?: CategoryRule[];
}

export const CATEGORY_TYPES: { value: PaymentCategoryType; label: string; color: string }[] = [
  { value: 'FEE', label: 'Fee', color: '#3B82F6' },
  { value: 'DEPOSIT', label: 'Deposit', color: '#10B981' },
  { value: 'REFUND', label: 'Refund', color: '#EF4444' },
  { value: 'DISCOUNT', label: 'Discount', color: '#F59E0B' },
  { value: 'TAX', label: 'Tax', color: '#8B5CF6' },
  { value: 'OTHER', label: 'Other', color: '#6B7280' },
];

class PaymentCategoriesService {
  private baseUrl = '/payment-categories';

  async getAll(includeInactive = false): Promise<PaymentCategory[]> {
    const response = await api.get(`${this.baseUrl}?includeInactive=${includeInactive}`);
    return response.data.data.categories;
  }

  async getById(id: string): Promise<PaymentCategory> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data.category;
  }

  async getByType(type: PaymentCategoryType): Promise<PaymentCategory[]> {
    const response = await api.get(`${this.baseUrl}/type/${type}`);
    return response.data.data.categories;
  }

  async create(data: CreatePaymentCategoryInput): Promise<PaymentCategory> {
    const response = await api.post(this.baseUrl, data);
    return response.data.data.category;
  }

  async update(id: string, data: UpdatePaymentCategoryInput): Promise<PaymentCategory> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data.data.category;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async toggleActive(id: string): Promise<PaymentCategory> {
    const response = await api.post(`${this.baseUrl}/${id}/toggle`);
    return response.data.data.category;
  }

  async duplicate(id: string): Promise<PaymentCategory> {
    const response = await api.post(`${this.baseUrl}/${id}/duplicate`);
    return response.data.data.category;
  }

  async reorder(categoryIds: string[]): Promise<void> {
    await api.post(`${this.baseUrl}/reorder`, { categoryIds });
  }

  async updateRules(id: string, rules: CategoryRule[]): Promise<PaymentCategory> {
    const response = await api.put(`${this.baseUrl}/${id}/rules`, { rules });
    return response.data.data.category;
  }

  async seedDefaults(): Promise<void> {
    await api.post(`${this.baseUrl}/seed-defaults`);
  }
}

export const paymentCategoriesService = new PaymentCategoriesService();
export default paymentCategoriesService;
