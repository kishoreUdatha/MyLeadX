/**
 * License Validation Middleware for Self-Hosted Deployments
 */

import { Request, Response, NextFunction } from 'express';

interface LicenseInfo {
  valid: boolean;
  plan: 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  maxLeads: number;
  features: string[];
  expiresAt: Date;
}

class LicenseValidator {
  private cachedLicense: LicenseInfo | null = null;
  private lastValidation: Date | null = null;

  private get licenseKey(): string {
    return process.env.LICENSE_KEY || '';
  }

  private get skipCheck(): boolean {
    return process.env.SKIP_LICENSE_CHECK === 'true';
  }

  async initialize(): Promise<void> {
    if (this.skipCheck || !this.licenseKey) {
      console.log('[License] License check disabled or not configured');
      return;
    }

    try {
      const result = await this.validate();
      if (result.valid) {
        this.cachedLicense = result;
        this.lastValidation = new Date();
        console.log(`[License] Valid - Plan: ${result.plan}`);
      }
    } catch (error) {
      console.error('[License] Validation error:', error);
    }
  }

  private async validate(): Promise<LicenseInfo> {
    const response = await fetch(`${process.env.LICENSE_SERVER_URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: this.licenseKey,
        domain: process.env.APP_DOMAIN,
      }),
    });
    return response.json();
  }

  hasFeature(feature: string): boolean {
    if (this.skipCheck) return true;
    return this.cachedLicense?.features.includes(feature) ?? true;
  }

  isValid(): boolean {
    if (this.skipCheck) return true;
    if (!this.licenseKey) return true;
    return this.cachedLicense?.valid ?? false;
  }
}

export const licenseValidator = new LicenseValidator();

export function validateLicense() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!licenseValidator.isValid()) {
      return res.status(403).json({ error: 'LICENSE_INVALID' });
    }
    next();
  };
}

export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!licenseValidator.hasFeature(feature)) {
      return res.status(403).json({ error: 'FEATURE_NOT_LICENSED', feature });
    }
    next();
  };
}

export async function initializeLicense(): Promise<void> {
  await licenseValidator.initialize();
}

export default licenseValidator;
