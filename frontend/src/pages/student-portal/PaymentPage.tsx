import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCardIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PaymentLinkData {
  paymentLink: {
    id: string;
    amount: number;
    feeType: string;
    expiresAt: string;
  };
  application: {
    applicationNumber: string;
    studentName: string;
    totalFee: number;
    paidAmount: number;
    balanceDue: number;
  };
  organization?: {
    name: string;
    brandName?: string;
    logo?: string;
    primaryColor?: string;
  };
}

interface PaymentOption {
  mode: string;
  label: string;
  description: string;
  available: boolean;
  recommended?: boolean;
}

type PaymentStep = 'options' | 'online' | 'proof' | 'success';

export const PaymentPage: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentLinkData | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [step, setStep] = useState<PaymentStep>('options');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Proof upload state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      fetchPaymentLink();
      fetchPaymentOptions();
    }
  }, [token]);

  const fetchPaymentLink = async () => {
    try {
      const response = await fetch(`/api/pay/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Payment link not found or expired');
        return;
      }

      setPaymentData(data.data);
    } catch (err) {
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentOptions = async () => {
    try {
      const response = await fetch(`/api/pay/${token}/options`);
      const data = await response.json();

      if (response.ok) {
        setPaymentOptions(data.data.paymentOptions);
      }
    } catch (err) {
      console.error('Failed to fetch payment options:', err);
    }
  };

  const handleOnlinePayment = async () => {
    setProcessing(true);
    try {
      // Create Razorpay order
      const response = await fetch(`/api/pay/${token}/create-order`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const { orderId, amount, currency, keyId, prefill } = data.data;

      // Initialize Razorpay
      const options = {
        key: keyId,
        amount: amount * 100,
        currency,
        name: paymentData?.organization?.brandName || 'Payment',
        description: `Fee Payment - ${paymentData?.application.applicationNumber}`,
        order_id: orderId,
        prefill,
        handler: async (response: any) => {
          // Verify payment
          try {
            const verifyResponse = await fetch(`/api/pay/${token}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyData.message);

            setStep('success');
            toast.success('Payment successful!');
          } catch (error: any) {
            toast.error(error.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const handleProofSubmit = async () => {
    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setProcessing(true);
    try {
      // In real implementation, upload file first and get URL
      // For now, simulate with placeholder
      const fileUrl = URL.createObjectURL(proofFile);

      const proofType = selectedMode.includes('CHEQUE')
        ? 'CHEQUE_IMAGE'
        : selectedMode.includes('DD')
        ? 'DD_IMAGE'
        : selectedMode.includes('BANK')
        ? 'BANK_STATEMENT'
        : 'SCREENSHOT';

      const response = await fetch(`/api/pay/${token}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMode: selectedMode,
          proofType,
          fileUrl,
          fileName: proofFile.name,
          fileSize: proofFile.size,
          transactionId: transactionId || undefined,
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
          bankName: bankName || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setStep('success');
      toast.success('Payment proof submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit proof');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Link Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!paymentData) return null;

  // Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            {selectedMode === 'ONLINE_CRM'
              ? 'Your payment has been processed successfully.'
              : 'Your payment proof has been submitted and will be verified shortly.'}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Application Number</p>
            <p className="font-bold text-gray-900">{paymentData.application.applicationNumber}</p>
          </div>
          <button
            onClick={() => navigate(`/track?app=${paymentData.application.applicationNumber}`)}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Track Application
          </button>
        </div>
      </div>
    );
  }

  // Proof Upload Step
  if (step === 'proof') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <button
              onClick={() => setStep('options')}
              className="text-sm text-gray-600 hover:text-gray-800 mb-4"
            >
              &larr; Back to options
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Payment Proof</h2>
            <p className="text-gray-600 mb-6">
              Please upload proof of your payment for verification
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Proof *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {proofFile ? (
                    <div>
                      <DocumentArrowUpIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">{proofFile.name}</p>
                      <button
                        onClick={() => setProofFile(null)}
                        className="text-sm text-red-600 hover:text-red-700 mt-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID / Reference Number
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter transaction ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter bank name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Any additional information..."
                />
              </div>

              <button
                onClick={handleProofSubmit}
                disabled={!proofFile || processing}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {processing ? 'Submitting...' : 'Submit Payment Proof'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment Options Step
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {paymentData.organization?.logo ? (
            <img
              src={paymentData.organization.logo}
              alt={paymentData.organization.name}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div className="w-14 h-14 bg-primary-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <CreditCardIcon className="h-7 w-7 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
        </div>

        {/* Amount Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">Application</p>
              <p className="font-medium">{paymentData.application.applicationNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Student</p>
              <p className="font-medium">{paymentData.application.studentName}</p>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between text-2xl font-bold">
              <span>Amount Due</span>
              <span className="text-primary-600">{formatCurrency(paymentData.paymentLink.amount)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {paymentData.paymentLink.feeType || 'Fee Payment'}
            </p>
          </div>
        </div>

        {/* Payment Options */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Select Payment Method</h2>
          <div className="space-y-3">
            {paymentOptions.map((option) => (
              <button
                key={option.mode}
                onClick={() => {
                  setSelectedMode(option.mode);
                  if (option.mode === 'ONLINE_CRM') {
                    handleOnlinePayment();
                  } else {
                    setStep('proof');
                  }
                }}
                disabled={!option.available || processing}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                  option.recommended
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className={`p-2 rounded-lg ${
                  option.mode === 'ONLINE_CRM'
                    ? 'bg-primary-100'
                    : option.mode.includes('BANK') || option.mode === 'UPI'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  {option.mode === 'ONLINE_CRM' ? (
                    <CreditCardIcon className="h-6 w-6 text-primary-600" />
                  ) : option.mode.includes('BANK') || option.mode === 'UPI' ? (
                    <BuildingLibraryIcon className="h-6 w-6 text-blue-600" />
                  ) : (
                    <BanknotesIcon className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">
                    {option.label}
                    {option.recommended && (
                      <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Notice */}
        <p className="text-center text-sm text-gray-500 mt-4">
          This payment link expires on{' '}
          {new Date(paymentData.paymentLink.expiresAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
