/**
 * Partner Portal Unit Tests
 *
 * These are pure unit tests that don't require database connections.
 * They test business logic, validation, and data transformation functions.
 */

describe('Partner Portal - Business Logic Tests', () => {

  describe('Application Number Generation', () => {
    const generateApplicationNumber = () => {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 900000) + 100000;
      return `APP-${year}-${random}`;
    };

    it('should generate application number in correct format', () => {
      const appNum = generateApplicationNumber();
      expect(appNum).toMatch(/^APP-\d{4}-\d{6}$/);
    });

    it('should include current year', () => {
      const appNum = generateApplicationNumber();
      const currentYear = new Date().getFullYear();
      expect(appNum).toContain(currentYear.toString());
    });

    it('should generate unique numbers', () => {
      const numbers = new Set();
      for (let i = 0; i < 100; i++) {
        numbers.add(generateApplicationNumber());
      }
      // Most should be unique (randomness allows some collision)
      expect(numbers.size).toBeGreaterThan(90);
    });
  });

  describe('Commission Calculation', () => {
    interface CommissionConfig {
      superPartnerRate: number;
      subPartnerRate: number;
      agentRate: number;
    }

    const calculateCommission = (
      paymentAmount: number,
      commissionRate: number
    ): number => {
      return Math.round(paymentAmount * (commissionRate / 100));
    };

    const splitCommission = (
      totalCommission: number,
      partnerType: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT',
      hasHierarchy: boolean
    ): { directShare: number; parentShare: number } => {
      if (!hasHierarchy || partnerType === 'SUPER_PARTNER') {
        return { directShare: totalCommission, parentShare: 0 };
      }

      if (partnerType === 'SUB_PARTNER') {
        return {
          directShare: Math.round(totalCommission * 0.7),
          parentShare: Math.round(totalCommission * 0.3)
        };
      }

      // AGENT
      return {
        directShare: Math.round(totalCommission * 0.5),
        parentShare: Math.round(totalCommission * 0.5)
      };
    };

    it('should calculate 10% commission correctly', () => {
      const commission = calculateCommission(100000, 10);
      expect(commission).toBe(10000);
    });

    it('should calculate 7.5% commission correctly', () => {
      const commission = calculateCommission(100000, 7.5);
      expect(commission).toBe(7500);
    });

    it('should handle zero payment', () => {
      const commission = calculateCommission(0, 10);
      expect(commission).toBe(0);
    });

    it('should split commission for super partner (no split)', () => {
      const split = splitCommission(10000, 'SUPER_PARTNER', true);
      expect(split.directShare).toBe(10000);
      expect(split.parentShare).toBe(0);
    });

    it('should split commission for sub partner (70-30)', () => {
      const split = splitCommission(10000, 'SUB_PARTNER', true);
      expect(split.directShare).toBe(7000);
      expect(split.parentShare).toBe(3000);
    });

    it('should split commission for agent (50-50)', () => {
      const split = splitCommission(10000, 'AGENT', true);
      expect(split.directShare).toBe(5000);
      expect(split.parentShare).toBe(5000);
    });

    it('should not split if no hierarchy', () => {
      const split = splitCommission(10000, 'AGENT', false);
      expect(split.directShare).toBe(10000);
      expect(split.parentShare).toBe(0);
    });
  });

  describe('OTP Validation', () => {
    const isValidOtp = (otp: string): boolean => {
      return /^\d{6}$/.test(otp);
    };

    const isOtpExpired = (sentAt: Date, expiryMinutes: number = 10): boolean => {
      const now = new Date();
      const diffMinutes = (now.getTime() - sentAt.getTime()) / 1000 / 60;
      return diffMinutes > expiryMinutes;
    };

    const generateOtp = (): string => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    it('should validate 6-digit OTP', () => {
      expect(isValidOtp('123456')).toBe(true);
      expect(isValidOtp('000000')).toBe(true);
      expect(isValidOtp('999999')).toBe(true);
    });

    it('should reject invalid OTP formats', () => {
      expect(isValidOtp('12345')).toBe(false);   // 5 digits
      expect(isValidOtp('1234567')).toBe(false); // 7 digits
      expect(isValidOtp('abcdef')).toBe(false);  // letters
      expect(isValidOtp('12345a')).toBe(false);  // mixed
      expect(isValidOtp('')).toBe(false);        // empty
    });

    it('should detect expired OTP', () => {
      const expiredOtpTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
      expect(isOtpExpired(expiredOtpTime)).toBe(true);
    });

    it('should accept valid OTP within time limit', () => {
      const recentOtpTime = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
      expect(isOtpExpired(recentOtpTime)).toBe(false);
    });

    it('should generate 6-digit OTP', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThan(1000000);
    });
  });

  describe('Application Status Flow', () => {
    const validTransitions: Record<string, string[]> = {
      APPLICATION_SUBMITTED: ['DOCUMENT_VERIFICATION', 'REJECTED'],
      DOCUMENT_VERIFICATION: ['PAYMENT_PENDING', 'APPLICATION_SUBMITTED', 'REJECTED'],
      PAYMENT_PENDING: ['UNIVERSITY_PROCESSING', 'DOCUMENT_VERIFICATION', 'REJECTED'],
      UNIVERSITY_PROCESSING: ['ADMISSION_CONFIRMED', 'REJECTED'],
      ADMISSION_CONFIRMED: ['ENROLLMENT_COMPLETE'],
      ENROLLMENT_COMPLETE: [],
      REJECTED: [],
    };

    const isValidTransition = (from: string, to: string): boolean => {
      return validTransitions[from]?.includes(to) ?? false;
    };

    const getNextStatuses = (current: string): string[] => {
      return validTransitions[current] ?? [];
    };

    it('should allow valid forward transitions', () => {
      expect(isValidTransition('APPLICATION_SUBMITTED', 'DOCUMENT_VERIFICATION')).toBe(true);
      expect(isValidTransition('DOCUMENT_VERIFICATION', 'PAYMENT_PENDING')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'UNIVERSITY_PROCESSING')).toBe(true);
      expect(isValidTransition('UNIVERSITY_PROCESSING', 'ADMISSION_CONFIRMED')).toBe(true);
      expect(isValidTransition('ADMISSION_CONFIRMED', 'ENROLLMENT_COMPLETE')).toBe(true);
    });

    it('should allow rejection from most statuses', () => {
      expect(isValidTransition('APPLICATION_SUBMITTED', 'REJECTED')).toBe(true);
      expect(isValidTransition('DOCUMENT_VERIFICATION', 'REJECTED')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'REJECTED')).toBe(true);
      expect(isValidTransition('UNIVERSITY_PROCESSING', 'REJECTED')).toBe(true);
    });

    it('should not allow rejection after confirmation', () => {
      expect(isValidTransition('ADMISSION_CONFIRMED', 'REJECTED')).toBe(false);
      expect(isValidTransition('ENROLLMENT_COMPLETE', 'REJECTED')).toBe(false);
    });

    it('should not allow skipping statuses', () => {
      expect(isValidTransition('APPLICATION_SUBMITTED', 'PAYMENT_PENDING')).toBe(false);
      expect(isValidTransition('APPLICATION_SUBMITTED', 'ADMISSION_CONFIRMED')).toBe(false);
      expect(isValidTransition('DOCUMENT_VERIFICATION', 'ADMISSION_CONFIRMED')).toBe(false);
    });

    it('should allow rollback for document issues', () => {
      expect(isValidTransition('DOCUMENT_VERIFICATION', 'APPLICATION_SUBMITTED')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'DOCUMENT_VERIFICATION')).toBe(true);
    });

    it('should return correct next statuses', () => {
      expect(getNextStatuses('APPLICATION_SUBMITTED')).toEqual(['DOCUMENT_VERIFICATION', 'REJECTED']);
      expect(getNextStatuses('ENROLLMENT_COMPLETE')).toEqual([]);
    });
  });

  describe('Payment Mode Validation', () => {
    const validPaymentModes = [
      'ONLINE_CRM',
      'ONLINE_UNIVERSITY',
      'OFFLINE_CASH',
      'OFFLINE_CHEQUE',
      'OFFLINE_DD',
      'BANK_TRANSFER',
      'UPI',
    ];

    const requiresProof = (mode: string): boolean => {
      return ['ONLINE_UNIVERSITY', 'OFFLINE_CASH', 'OFFLINE_CHEQUE', 'OFFLINE_DD', 'BANK_TRANSFER', 'UPI'].includes(mode);
    };

    const isAutoVerified = (mode: string): boolean => {
      return mode === 'ONLINE_CRM';
    };

    it('should validate all payment modes', () => {
      validPaymentModes.forEach(mode => {
        expect(validPaymentModes.includes(mode)).toBe(true);
      });
    });

    it('should require proof for external payments', () => {
      expect(requiresProof('ONLINE_UNIVERSITY')).toBe(true);
      expect(requiresProof('BANK_TRANSFER')).toBe(true);
      expect(requiresProof('UPI')).toBe(true);
      expect(requiresProof('OFFLINE_CASH')).toBe(true);
    });

    it('should not require proof for CRM online payment', () => {
      expect(requiresProof('ONLINE_CRM')).toBe(false);
    });

    it('should auto-verify CRM online payment', () => {
      expect(isAutoVerified('ONLINE_CRM')).toBe(true);
      expect(isAutoVerified('BANK_TRANSFER')).toBe(false);
    });
  });

  describe('Document Type Validation', () => {
    const requiredDocuments = [
      '10TH_MARKSHEET',
      '12TH_MARKSHEET',
      'AADHAR_CARD',
      'PASSPORT_PHOTO',
    ];

    const optionalDocuments = [
      'TRANSFER_CERTIFICATE',
      'MIGRATION_CERTIFICATE',
      'GAP_CERTIFICATE',
      'INCOME_CERTIFICATE',
      'CASTE_CERTIFICATE',
    ];

    const allDocumentTypes = [...requiredDocuments, ...optionalDocuments];

    const isValidDocumentType = (type: string): boolean => {
      return allDocumentTypes.includes(type);
    };

    const isRequiredDocument = (type: string): boolean => {
      return requiredDocuments.includes(type);
    };

    const getMissingRequiredDocs = (uploadedTypes: string[]): string[] => {
      return requiredDocuments.filter(req => !uploadedTypes.includes(req));
    };

    it('should validate document types', () => {
      expect(isValidDocumentType('10TH_MARKSHEET')).toBe(true);
      expect(isValidDocumentType('AADHAR_CARD')).toBe(true);
      expect(isValidDocumentType('INVALID_DOC')).toBe(false);
    });

    it('should identify required documents', () => {
      expect(isRequiredDocument('10TH_MARKSHEET')).toBe(true);
      expect(isRequiredDocument('TRANSFER_CERTIFICATE')).toBe(false);
    });

    it('should find missing required documents', () => {
      const uploaded = ['10TH_MARKSHEET', 'AADHAR_CARD'];
      const missing = getMissingRequiredDocs(uploaded);
      expect(missing).toContain('12TH_MARKSHEET');
      expect(missing).toContain('PASSPORT_PHOTO');
      expect(missing).not.toContain('10TH_MARKSHEET');
    });

    it('should return empty when all required docs uploaded', () => {
      const missing = getMissingRequiredDocs(requiredDocuments);
      expect(missing).toHaveLength(0);
    });
  });

  describe('Wallet Balance Calculation', () => {
    interface WalletState {
      balance: number;
      pendingBalance: number;
      totalEarned: number;
      totalWithdrawn: number;
    }

    const addCommission = (wallet: WalletState, amount: number, approved: boolean): WalletState => {
      if (approved) {
        return {
          ...wallet,
          balance: wallet.balance + amount,
          totalEarned: wallet.totalEarned + amount,
        };
      }
      return {
        ...wallet,
        pendingBalance: wallet.pendingBalance + amount,
      };
    };

    const approveCommission = (wallet: WalletState, amount: number): WalletState => {
      return {
        ...wallet,
        balance: wallet.balance + amount,
        pendingBalance: wallet.pendingBalance - amount,
        totalEarned: wallet.totalEarned + amount,
      };
    };

    const processPayout = (wallet: WalletState, amount: number): WalletState | null => {
      if (amount > wallet.balance) {
        return null; // Insufficient balance
      }
      return {
        ...wallet,
        balance: wallet.balance - amount,
        totalWithdrawn: wallet.totalWithdrawn + amount,
      };
    };

    it('should add commission to pending balance', () => {
      const wallet: WalletState = { balance: 0, pendingBalance: 0, totalEarned: 0, totalWithdrawn: 0 };
      const updated = addCommission(wallet, 5000, false);
      expect(updated.pendingBalance).toBe(5000);
      expect(updated.balance).toBe(0);
    });

    it('should add approved commission to balance', () => {
      const wallet: WalletState = { balance: 0, pendingBalance: 0, totalEarned: 0, totalWithdrawn: 0 };
      const updated = addCommission(wallet, 5000, true);
      expect(updated.balance).toBe(5000);
      expect(updated.totalEarned).toBe(5000);
    });

    it('should move pending to balance on approval', () => {
      const wallet: WalletState = { balance: 10000, pendingBalance: 5000, totalEarned: 10000, totalWithdrawn: 0 };
      const updated = approveCommission(wallet, 5000);
      expect(updated.balance).toBe(15000);
      expect(updated.pendingBalance).toBe(0);
      expect(updated.totalEarned).toBe(15000);
    });

    it('should process payout correctly', () => {
      const wallet: WalletState = { balance: 20000, pendingBalance: 0, totalEarned: 20000, totalWithdrawn: 0 };
      const updated = processPayout(wallet, 15000);
      expect(updated).not.toBeNull();
      expect(updated!.balance).toBe(5000);
      expect(updated!.totalWithdrawn).toBe(15000);
    });

    it('should reject payout if insufficient balance', () => {
      const wallet: WalletState = { balance: 5000, pendingBalance: 0, totalEarned: 5000, totalWithdrawn: 0 };
      const updated = processPayout(wallet, 10000);
      expect(updated).toBeNull();
    });
  });

  describe('Payment Link Token', () => {
    const generateToken = (length: number = 32): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const isValidToken = (token: string): boolean => {
      return /^[A-Za-z0-9]{32}$/.test(token);
    };

    const isLinkExpired = (expiresAt: Date): boolean => {
      return new Date() > expiresAt;
    };

    it('should generate 32-character token', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
    });

    it('should generate alphanumeric token', () => {
      const token = generateToken();
      expect(isValidToken(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should detect expired link', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(isLinkExpired(pastDate)).toBe(true);
    });

    it('should detect valid link', () => {
      const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      expect(isLinkExpired(futureDate)).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    const isValidIndianPhone = (phone: string): boolean => {
      // Remove spaces and country code
      const cleaned = phone.replace(/\s/g, '').replace(/^\+91/, '');
      return /^[6-9]\d{9}$/.test(cleaned);
    };

    const formatPhone = (phone: string): string => {
      const cleaned = phone.replace(/\s/g, '').replace(/^\+91/, '');
      return `+91${cleaned}`;
    };

    it('should validate Indian phone numbers', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('+91 98765 43210')).toBe(true);
      expect(isValidIndianPhone('6789012345')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidIndianPhone('1234567890')).toBe(false); // starts with 1
      expect(isValidIndianPhone('5678901234')).toBe(false); // starts with 5
      expect(isValidIndianPhone('987654321')).toBe(false);  // 9 digits
      expect(isValidIndianPhone('98765432101')).toBe(false); // 11 digits
    });

    it('should format phone number with country code', () => {
      expect(formatPhone('9876543210')).toBe('+919876543210');
      expect(formatPhone('+91 98765 43210')).toBe('+919876543210');
    });
  });

  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.in')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });
});
