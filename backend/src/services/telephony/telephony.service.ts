/**
 * Telephony Service
 * Provider-agnostic telephony abstraction layer
 *
 * Automatically routes calls to the correct provider based on phone number
 */

import { prisma } from '../../config/database';
import {
  ITelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  CallResult,
  CallStatus,
  EndCallResult,
} from './telephony.types';
import { PlivoProvider, plivoProvider } from './providers/plivo.provider';
import { ExotelProvider, exotelProvider } from './providers/exotel.provider';

class TelephonyService {
  private providers: Map<TelephonyProviderType, ITelephonyProvider> = new Map();

  constructor() {
    // Register available providers
    this.providers.set('PLIVO', plivoProvider);
    this.providers.set('EXOTEL', exotelProvider);
  }

  /**
   * Get provider instance by name
   */
  getProvider(providerName: TelephonyProviderType): ITelephonyProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown telephony provider: ${providerName}`);
    }
    return provider;
  }

  /**
   * Get provider for a specific phone number
   * Looks up the phone number in database to determine provider
   */
  async getProviderForNumber(phoneNumber: string): Promise<ITelephonyProvider | null> {
    try {
      // Clean the phone number for lookup
      const cleanNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, '');

      // Try to find the phone number in our database
      const phoneRecord = await prisma.phoneNumber.findFirst({
        where: {
          OR: [
            { number: { contains: cleanNumber.slice(-10) } },
            { number: phoneNumber },
            { displayNumber: phoneNumber },
          ],
        },
      });

      if (phoneRecord?.provider) {
        const providerName = phoneRecord.provider as TelephonyProviderType;
        console.log(`[Telephony] Found provider ${providerName} for number ${phoneNumber}`);
        return this.getProvider(providerName);
      }

      // If not found in DB, try to detect from configuration
      return await this.getDefaultProvider();
    } catch (error) {
      console.error('[Telephony] Error getting provider for number:', error);
      return await this.getDefaultProvider();
    }
  }

  /**
   * Get the default/fallback provider
   * Checks which providers are configured and returns the first available
   */
  async getDefaultProvider(): Promise<ITelephonyProvider | null> {
    // Priority: Plivo first (more common), then Exotel
    if (await plivoProvider.isConfigured()) {
      console.log('[Telephony] Using default provider: PLIVO');
      return plivoProvider;
    }

    if (await exotelProvider.isConfigured()) {
      console.log('[Telephony] Using default provider: EXOTEL');
      return exotelProvider;
    }

    console.error('[Telephony] No telephony provider configured');
    return null;
  }

  /**
   * Get provider for a user based on their assigned phone number
   */
  async getProviderForUser(userId: string, organizationId: string): Promise<{
    provider: ITelephonyProvider | null;
    phoneNumber: string | null;
  }> {
    try {
      // Get user's assigned phone number
      const assignedNumber = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          assignedToUserId: userId,
          status: 'AVAILABLE',
        },
      });

      if (assignedNumber) {
        const providerName = (assignedNumber.provider || 'PLIVO') as TelephonyProviderType;
        return {
          provider: this.getProvider(providerName),
          phoneNumber: assignedNumber.number,
        };
      }

      // Fall back to any available number in the organization
      const orgNumber = await prisma.phoneNumber.findFirst({
        where: {
          organizationId,
          status: 'AVAILABLE',
          assignedToUserId: null,
          assignedToAgentId: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (orgNumber) {
        const providerName = (orgNumber.provider || 'PLIVO') as TelephonyProviderType;
        return {
          provider: this.getProvider(providerName),
          phoneNumber: orgNumber.number,
        };
      }

      // No phone number found
      return { provider: null, phoneNumber: null };
    } catch (error) {
      console.error('[Telephony] Error getting provider for user:', error);
      return { provider: null, phoneNumber: null };
    }
  }

  /**
   * Make an outbound call
   * Automatically selects the provider based on the 'from' phone number
   */
  async makeCall(params: {
    from: string;
    to: string;
    userId?: string;
    organizationId?: string;
    answerUrl?: string;
    statusCallback?: string;
    record?: boolean;
    customData?: Record<string, any>;
  }): Promise<CallResult> {
    // Get provider based on the 'from' number
    const provider = await this.getProviderForNumber(params.from);

    if (!provider) {
      return {
        success: false,
        error: 'No telephony provider configured for this number',
        provider: 'PLIVO', // default
      };
    }

    // Make the call
    return provider.makeCall({
      from: params.from,
      to: params.to,
      answerUrl: params.answerUrl,
      statusCallback: params.statusCallback,
      record: params.record ?? true,
      customData: params.customData,
    });
  }

  /**
   * Make a call using user's assigned number
   * This is the main method for softphone calls
   */
  async makeCallForUser(params: {
    userId: string;
    organizationId: string;
    to: string;
    answerUrl?: string;
    statusCallback?: string;
    record?: boolean;
    customData?: Record<string, any>;
  }): Promise<CallResult> {
    // Get provider and phone number for user
    const { provider, phoneNumber } = await this.getProviderForUser(
      params.userId,
      params.organizationId
    );

    if (!provider || !phoneNumber) {
      return {
        success: false,
        error: 'No phone number assigned. Please contact your admin to assign a phone number.',
        provider: 'PLIVO',
      };
    }

    console.log(`[Telephony] Making call for user ${params.userId} using ${provider.providerName} from ${phoneNumber}`);

    // Make the call
    return provider.makeCall({
      from: phoneNumber,
      to: params.to,
      answerUrl: params.answerUrl,
      statusCallback: params.statusCallback,
      record: params.record ?? true,
      customData: params.customData,
    });
  }

  /**
   * End a call
   */
  async endCall(callId: string, provider: TelephonyProviderType): Promise<EndCallResult> {
    const providerInstance = this.getProvider(provider);
    return providerInstance.endCall(callId);
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string, provider: TelephonyProviderType): Promise<CallStatus | null> {
    const providerInstance = this.getProvider(provider);
    return providerInstance.getCallStatus(callId);
  }

  /**
   * Parse webhook from provider
   */
  parseWebhook(provider: TelephonyProviderType, body: any): CallStatus {
    const providerInstance = this.getProvider(provider);
    return providerInstance.parseWebhook(body);
  }

  /**
   * Check which providers are available
   */
  async getAvailableProviders(): Promise<TelephonyProviderType[]> {
    const available: TelephonyProviderType[] = [];

    if (await plivoProvider.isConfigured()) {
      available.push('PLIVO');
    }

    if (await exotelProvider.isConfigured()) {
      available.push('EXOTEL');
    }

    return available;
  }

  /**
   * Get status of all providers
   */
  async getProvidersStatus(): Promise<Record<TelephonyProviderType, { configured: boolean; balance?: number }>> {
    const [plivoConfig, exotelConfig] = await Promise.all([
      plivoProvider.getConfig(),
      exotelProvider.getConfig(),
    ]);

    return {
      PLIVO: {
        configured: plivoConfig.isConfigured,
        balance: plivoConfig.balance,
      },
      EXOTEL: {
        configured: exotelConfig.isConfigured,
        balance: exotelConfig.balance,
      },
      TWILIO: {
        configured: false, // Not implemented yet
      },
    };
  }
}

// Export singleton instance
export const telephonyService = new TelephonyService();
export default telephonyService;
