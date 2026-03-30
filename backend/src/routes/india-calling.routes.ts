import { Router, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { indiaRoutingService } from '../integrations/india-routing.service';
import { plivoVoiceService } from '../integrations/plivo-voice.service';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== LANGUAGES ====================

// Get all supported Indian languages
router.get('/languages', async (req: TenantRequest, res: Response) => {
  try {
    const languages = indiaRoutingService.getAllLanguages();
    ApiResponse.success(res, 'Languages retrieved', languages);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== REGIONS ====================

// Get all Indian regions
router.get('/regions', async (req: TenantRequest, res: Response) => {
  try {
    const regions = indiaRoutingService.getAllRegions();
    ApiResponse.success(res, 'Regions retrieved', regions);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get routing info for a phone number
router.get('/routing/:phone', async (req: TenantRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const routingInfo = await indiaRoutingService.getRegionalRoutingInfo(phone);
    ApiResponse.success(res, 'Routing info retrieved', routingInfo);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get recommended language for phone number
router.get('/language/:phone', async (req: TenantRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const language = indiaRoutingService.getRecommendedLanguage(phone);
    const { region, state } = indiaRoutingService.getRegionFromPhone(phone);

    ApiResponse.success(res, 'Language recommendation', {
      phone,
      recommendedLanguage: language,
      region: region?.code,
      regionName: region?.name,
      state,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== BUSINESS HOURS ====================

// Check if within business hours
router.get('/business-hours', async (req: TenantRequest, res: Response) => {
  try {
    const { region } = req.query;
    const regionCode = (region as string) || 'NORTH';

    const withinHours = indiaRoutingService.isWithinBusinessHours(regionCode);
    const bestTime = indiaRoutingService.getBestCallTime(regionCode);
    const isHoliday = indiaRoutingService.isHoliday();

    ApiResponse.success(res, 'Business hours info', {
      region: regionCode,
      withinBusinessHours: withinHours,
      isHoliday,
      bestCallTime: bestTime,
      currentTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== PHONE VALIDATION ====================

// Validate Indian phone number
router.post('/validate-phone', async (req: TenantRequest, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    const isValid = indiaRoutingService.isValidIndianNumber(phone);
    const formatted = indiaRoutingService.formatIndianNumber(phone);
    const { region, state } = indiaRoutingService.getRegionFromPhone(phone);

    ApiResponse.success(res, 'Phone validation result', {
      original: phone,
      formatted,
      isValid,
      region: region?.code,
      regionName: region?.name,
      state,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Bulk validate phone numbers
router.post('/validate-phones', async (req: TenantRequest, res: Response) => {
  try {
    const { phones } = req.body;

    if (!phones || !Array.isArray(phones)) {
      return ApiResponse.error(res, 'Phones array is required', 400);
    }

    const results = phones.map(phone => {
      const isValid = indiaRoutingService.isValidIndianNumber(phone);
      const formatted = indiaRoutingService.formatIndianNumber(phone);
      const { region, state } = indiaRoutingService.getRegionFromPhone(phone);

      return {
        original: phone,
        formatted,
        isValid,
        region: region?.code,
        state,
      };
    });

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.filter(r => !r.isValid).length;

    ApiResponse.success(res, 'Bulk validation complete', {
      total: phones.length,
      valid: validCount,
      invalid: invalidCount,
      results,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== PLIVO SPECIFIC ====================

// Get Plivo pricing for India
router.get('/pricing', async (req: TenantRequest, res: Response) => {
  try {
    const pricing = {
      provider: process.env.VOICE_PROVIDER || 'twilio',
      currency: 'INR',
      outbound: {
        mobile: plivoVoiceService.getCallPricing('mobile', 'outbound'),
        landline: plivoVoiceService.getCallPricing('landline', 'outbound'),
      },
      inbound: {
        mobile: plivoVoiceService.getCallPricing('mobile', 'inbound'),
        landline: plivoVoiceService.getCallPricing('landline', 'inbound'),
      },
      sms: {
        outbound: plivoVoiceService.getSMSPricing('outbound'),
        inbound: plivoVoiceService.getSMSPricing('inbound'),
      },
    };

    ApiResponse.success(res, 'Pricing info', pricing);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Estimate call cost
router.post('/estimate-cost', async (req: TenantRequest, res: Response) => {
  try {
    const { durationSeconds, phoneType = 'mobile' } = req.body;

    if (!durationSeconds) {
      return ApiResponse.error(res, 'Duration in seconds is required', 400);
    }

    const estimatedCost = plivoVoiceService.estimateCallCost(
      durationSeconds,
      phoneType as 'mobile' | 'landline'
    );

    ApiResponse.success(res, 'Cost estimate', {
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      phoneType,
      estimatedCostINR: estimatedCost,
      currency: 'INR',
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== PROVIDER CONFIG ====================

// Get current provider configuration
router.get('/provider-config', async (req: TenantRequest, res: Response) => {
  try {
    const provider = process.env.VOICE_PROVIDER || 'twilio';
    const smsProvider = process.env.SMS_PROVIDER || 'twilio';

    ApiResponse.success(res, 'Provider configuration', {
      voiceProvider: provider,
      smsProvider,
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      plivoConfigured: !!(process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN),
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ? '****' + process.env.TWILIO_PHONE_NUMBER.slice(-4) : null,
      plivoPhoneNumber: process.env.PLIVO_PHONE_NUMBER ? '****' + process.env.PLIVO_PHONE_NUMBER.slice(-4) : null,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
