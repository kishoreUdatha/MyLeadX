import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

interface OtpVerificationProps {
  identifier: string;
  identifierType: 'PHONE' | 'EMAIL';
  purpose:
    | 'PHONE_VERIFICATION'
    | 'EMAIL_VERIFICATION'
    | 'APPLICATION_SUBMISSION'
    | 'DOCUMENT_UPLOAD'
    | 'PAYMENT_CONFIRMATION'
    | 'ADMISSION_CONFIRMATION';
  channel?: 'SMS' | 'EMAIL' | 'WHATSAPP';
  onVerified: () => void;
  onCancel?: () => void;
  leadId?: string;
  applicationId?: string;
  autoSend?: boolean;
}

export const OtpVerification: React.FC<OtpVerificationProps> = ({
  identifier,
  identifierType,
  purpose,
  channel,
  onVerified,
  onCancel,
  leadId,
  applicationId,
  autoSend = true,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-send OTP on mount
  useEffect(() => {
    if (autoSend && !sent) {
      sendOtp();
    }
  }, [autoSend]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Countdown timer for expiry
  useEffect(() => {
    if (expiresIn !== null && expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiresIn]);

  const sendOtp = async () => {
    try {
      setSending(true);
      setError(null);

      const response = await api.post('/otp/send', {
        identifier,
        identifierType,
        purpose,
        channel: channel || (identifierType === 'EMAIL' ? 'EMAIL' : 'SMS'),
        leadId,
        applicationId,
      });

      if (response.data.success) {
        setSent(true);
        setResendCooldown(60);
        setExpiresIn(600); // 10 minutes
        toast.success(response.data.message);
        // Focus first input
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to send OTP';
      setError(message);
      toast.error(message);

      // Handle cooldown from server
      if (err.response?.data?.data?.canResendAt) {
        const canResendAt = new Date(err.response.data.data.canResendAt);
        const cooldown = Math.ceil((canResendAt.getTime() - Date.now()) / 1000);
        setResendCooldown(Math.max(0, cooldown));
      }
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/otp/verify', {
        identifier,
        purpose,
        otp: otpValue,
      });

      if (response.data.success) {
        setVerified(true);
        toast.success('Verification successful!');
        setTimeout(() => onVerified(), 1000);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Verification failed';
      setError(message);

      if (err.response?.data?.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.response.data.data.attemptsRemaining);
      }

      // Clear OTP on failed attempt
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      setTimeout(() => verifyOtp(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      pastedData.split('').forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);

      // Auto-verify if complete
      if (pastedData.length === 6) {
        setTimeout(() => verifyOtp(), 100);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskIdentifier = (id: string, type: 'PHONE' | 'EMAIL'): string => {
    if (type === 'EMAIL') {
      const [username, domain] = id.split('@');
      return `${username.substring(0, 2)}***@${domain}`;
    }
    return `******${id.slice(-4)}`;
  };

  if (verified) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Verified Successfully</h3>
        <p className="text-sm text-gray-500">Your {identifierType.toLowerCase()} has been verified.</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {identifierType === 'EMAIL' ? 'Email' : 'Phone'} Verification
        </h3>
        <p className="text-sm text-gray-500">
          {sent ? (
            <>
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-gray-700">
                {maskIdentifier(identifier, identifierType)}
              </span>
            </>
          ) : (
            <>
              We'll send a verification code to{' '}
              <span className="font-medium text-gray-700">
                {maskIdentifier(identifier, identifierType)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* OTP Input */}
      {sent && (
        <>
          <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading || verified}
                className={`w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  ${loading ? 'bg-gray-100' : 'bg-white'}
                `}
              />
            ))}
          </div>

          {/* Timer */}
          {expiresIn !== null && expiresIn > 0 && (
            <p className="text-center text-xs text-gray-500 mb-4">
              Code expires in {formatTime(expiresIn)}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
              <XCircleIcon className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Attempts remaining */}
          {attemptsRemaining !== null && attemptsRemaining > 0 && (
            <p className="text-center text-xs text-orange-600 mb-4">
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {!sent ? (
          <button
            onClick={sendOtp}
            disabled={sending}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Verification Code'
            )}
          </button>
        ) : (
          <>
            <button
              onClick={verifyOtp}
              disabled={loading || otp.some(d => d === '')}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend code in {formatTime(resendCooldown)}
                </p>
              ) : (
                <button
                  onClick={sendOtp}
                  disabled={sending}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Didn't receive code? Resend
                </button>
              )}
            </div>
          </>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpVerification;
