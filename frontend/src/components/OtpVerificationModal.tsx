import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import OtpVerification from './OtpVerification';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  leadId?: string;
  applicationId?: string;
  title?: string;
  description?: string;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  identifier,
  identifierType,
  purpose,
  channel,
  onVerified,
  leadId,
  applicationId,
  title,
  description,
}) => {
  if (!isOpen) return null;

  const handleVerified = () => {
    onVerified();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          {/* Custom title/description */}
          {(title || description) && (
            <div className="text-center mb-4">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
          )}

          {/* OTP Verification Component */}
          <OtpVerification
            identifier={identifier}
            identifierType={identifierType}
            purpose={purpose}
            channel={channel}
            onVerified={handleVerified}
            onCancel={onClose}
            leadId={leadId}
            applicationId={applicationId}
            autoSend={true}
          />
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
