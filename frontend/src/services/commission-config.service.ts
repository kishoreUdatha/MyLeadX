/**
 * Commission Config Service
 * Handles commission configuration per admission type
 */

import api from './api';

export type AdmissionType = 'DONATION' | 'NON_DONATION' | 'NRI' | 'SCHOLARSHIP';

export interface CommissionConfig {
  id: string;
  organizationId: string;
  admissionType: AdmissionType;
  telecallerAmount: number;
  teamLeadAmount: number;
  managerAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionConfigInput {
  admissionType: AdmissionType;
  telecallerAmount: number;
  teamLeadAmount: number;
  managerAmount: number;
}

class CommissionConfigService {
  /**
   * Get all commission configs
   */
  async getAll(): Promise<CommissionConfig[]> {
    const response = await api.get('/commission-config');
    return response.data.data;
  }

  /**
   * Initialize default configs for all admission types
   */
  async initialize(): Promise<CommissionConfig[]> {
    const response = await api.post('/commission-config/initialize');
    return response.data.data;
  }

  /**
   * Update commission configs (bulk)
   */
  async bulkUpdate(configs: CommissionConfigInput[]): Promise<CommissionConfig[]> {
    const response = await api.put('/commission-config', { configs });
    return response.data.data;
  }

  /**
   * Update single commission config
   */
  async update(admissionType: AdmissionType, data: Omit<CommissionConfigInput, 'admissionType'>): Promise<CommissionConfig> {
    const response = await api.put(`/commission-config/${admissionType}`, data);
    return response.data.data;
  }
}

export const commissionConfigService = new CommissionConfigService();
