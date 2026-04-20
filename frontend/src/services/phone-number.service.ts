import api from './api';

export interface PhoneNumber {
  id: string;
  organizationId: string;
  number: string;
  displayNumber?: string;
  friendlyName?: string;
  provider: 'EXOTEL' | 'TWILIO' | 'PLIVO' | 'MSG91' | 'MANUAL';
  providerNumberId?: string;
  type: 'LOCAL' | 'TOLL_FREE' | 'MOBILE' | 'VIRTUAL';
  capabilities: {
    voice?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  status: 'AVAILABLE' | 'ASSIGNED' | 'DISABLED' | 'PENDING';
  assignedToAgentId?: string;
  assignedToUserId?: string;
  assignedAt?: string;
  monthlyRent: number;
  perMinuteRate: number;
  currency: string;
  region?: string;
  city?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent?: {
    id: string;
    name: string;
    industry?: string;
  };
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    callLogs: number;
  };
}

export interface PhoneNumberStats {
  total: number;
  available: number;
  assigned: number;
  disabled: number;
  monthlyStats: {
    totalCalls: number;
    totalMinutes: number;
    totalCost: number;
  };
}

export interface CreatePhoneNumberInput {
  number: string;
  displayNumber?: string;
  friendlyName?: string;
  provider?: 'EXOTEL' | 'TWILIO' | 'PLIVO' | 'MSG91' | 'MANUAL';
  providerNumberId?: string;
  type?: 'LOCAL' | 'TOLL_FREE' | 'MOBILE' | 'VIRTUAL';
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  monthlyRent?: number;
  perMinuteRate?: number;
  currency?: string;
  region?: string;
  city?: string;
  notes?: string;
}

export interface UpdatePhoneNumberInput {
  displayNumber?: string;
  friendlyName?: string;
  type?: 'LOCAL' | 'TOLL_FREE' | 'MOBILE' | 'VIRTUAL';
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  status?: 'AVAILABLE' | 'ASSIGNED' | 'DISABLED' | 'PENDING';
  monthlyRent?: number;
  perMinuteRate?: number;
  region?: string;
  city?: string;
  notes?: string;
}

class PhoneNumberService {
  // Get all phone numbers
  async getPhoneNumbers(filters?: {
    status?: string;
    type?: string;
    agentId?: string;
    unassigned?: boolean;
  }): Promise<PhoneNumber[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.agentId) params.append('agentId', filters.agentId);
    if (filters?.unassigned) params.append('unassigned', 'true');

    const response = await api.get(`/phone-numbers?${params.toString()}`);
    return response.data.data;
  }

  // Get phone number stats
  async getStats(): Promise<PhoneNumberStats> {
    const response = await api.get('/phone-numbers/stats');
    return response.data.data;
  }

  // Get a single phone number
  async getPhoneNumber(id: string): Promise<PhoneNumber> {
    const response = await api.get(`/phone-numbers/${id}`);
    return response.data.data;
  }

  // Create a new phone number
  async createPhoneNumber(input: CreatePhoneNumberInput): Promise<PhoneNumber> {
    const response = await api.post('/phone-numbers', input);
    return response.data.data;
  }

  // Update a phone number
  async updatePhoneNumber(id: string, input: UpdatePhoneNumberInput): Promise<PhoneNumber> {
    const response = await api.put(`/phone-numbers/${id}`, input);
    return response.data.data;
  }

  // Delete a phone number
  async deletePhoneNumber(id: string): Promise<void> {
    await api.delete(`/phone-numbers/${id}`);
  }

  // Assign phone number to agent
  async assignToAgent(phoneNumberId: string, agentId: string): Promise<PhoneNumber> {
    const response = await api.post(`/phone-numbers/${phoneNumberId}/assign`, { agentId });
    return response.data.data;
  }

  // Unassign phone number from agent
  async unassignFromAgent(phoneNumberId: string): Promise<PhoneNumber> {
    const response = await api.post(`/phone-numbers/${phoneNumberId}/unassign`);
    return response.data.data;
  }

  // Assign phone number to user (telecaller)
  async assignToUser(phoneNumberId: string, userId: string): Promise<PhoneNumber> {
    const response = await api.post(`/phone-numbers/${phoneNumberId}/assign-user`, { userId });
    return response.data.data;
  }

  // Unassign phone number from user
  async unassignFromUser(phoneNumberId: string): Promise<PhoneNumber> {
    const response = await api.post(`/phone-numbers/${phoneNumberId}/unassign-user`);
    return response.data.data;
  }

  // Get phone numbers for a specific user
  async getUserPhoneNumbers(userId: string): Promise<PhoneNumber[]> {
    const response = await api.get(`/phone-numbers/user/${userId}`);
    return response.data.data;
  }

  // Get phone numbers for a specific agent
  async getAgentPhoneNumbers(agentId: string): Promise<PhoneNumber[]> {
    const response = await api.get(`/phone-numbers/agent/${agentId}`);
    return response.data.data;
  }

  // Bulk import phone numbers
  async bulkImport(numbers: CreatePhoneNumberInput[]): Promise<{
    success: number;
    failed: number;
    errors: { number: string; error: string }[];
  }> {
    const response = await api.post('/phone-numbers/bulk-import', { numbers });
    return response.data.data;
  }

  // Format phone number for display
  formatPhoneNumber(number: string): string {
    if (number.startsWith('+91') && number.length === 13) {
      const digits = number.slice(3);
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return number;
  }

  // Get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'green';
      case 'ASSIGNED':
        return 'blue';
      case 'DISABLED':
        return 'red';
      case 'PENDING':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  // Get provider display name
  getProviderName(provider: string): string {
    const providers: Record<string, string> = {
      EXOTEL: 'Exotel',
      TWILIO: 'Twilio',
      PLIVO: 'Plivo',
      MSG91: 'MSG91',
      MANUAL: 'Manual',
    };
    return providers[provider] || provider;
  }
}

export const phoneNumberService = new PhoneNumberService();
export default phoneNumberService;
