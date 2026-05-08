import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  DocumentArrowUpIcon,
  CurrencyRupeeIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  applicationNumber: string;
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  status: string;
  documentsStatus: string;
  paymentStatus: string;
  totalFee: number;
  scholarshipAmount: number;
  netFee: number;
  paidAmount: number;
  createdAt: string;
}

interface Document {
  id: string;
  documentType: string;
  documentName: string;
  fileName: string;
  status: string;
  rejectionReason?: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentMode: string;
  status: string;
  paymentDate: string;
}

interface TimelineEvent {
  status: string;
  date: string;
  notes?: string;
}

type Step = 'phone' | 'otp' | 'dashboard';

const statusSteps = [
  { key: 'APPLICATION_SUBMITTED', label: 'Submitted' },
  { key: 'DOCUMENT_VERIFIED', label: 'Documents Verified' },
  { key: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { key: 'ADMISSION_CONFIRMED', label: 'Admission Confirmed' },
];

export const TrackApplicationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [applicationNumber, setApplicationNumber] = useState(searchParams.get('app') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    // Check for existing session
    const token = sessionStorage.getItem('student_session_token');
    if (token) {
      setSessionToken(token);
      fetchApplication(token);
    }
  }, []);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student-portal/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, applicationNumber: applicationNumber || undefined }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast.success('OTP sent to your phone');
      setStep('otp');

      // In dev mode, auto-fill OTP if returned
      if (data.data?.otp) {
        setOtp(data.data.otp);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student-portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const token = data.data.sessionToken;
      setSessionToken(token);
      sessionStorage.setItem('student_session_token', token);

      await fetchApplication(token);
      setStep('dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplication = async (token: string) => {
    try {
      const response = await fetch('/api/student-portal/my-application', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        sessionStorage.removeItem('student_session_token');
        setStep('phone');
        return;
      }

      const data = await response.json();
      setApplication(data.data.application);
      setDocuments(data.data.documents || []);
      setPayments(data.data.payments || []);
      setTimeline(data.data.timeline || []);
      setStep('dashboard');
    } catch (error) {
      sessionStorage.removeItem('student_session_token');
      setStep('phone');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const getCurrentStatusIndex = () => {
    if (!application) return -1;
    const statusOrder = ['APPLICATION_SUBMITTED', 'DOCUMENT_VERIFIED', 'PAYMENT_VERIFIED', 'ADMISSION_CONFIRMED'];
    return statusOrder.findIndex(s => application.status === s || application.status.includes(s.split('_')[0]));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('student_session_token');
    setSessionToken('');
    setApplication(null);
    setStep('phone');
  };

  // Phone Entry Step
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Track Your Application</h1>
            <p className="text-gray-600 mt-2">Enter your phone number to check status</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter 10-digit phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Number (Optional)
                </label>
                <input
                  type="text"
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., APP-2024-001"
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Verification Step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify OTP</h1>
            <p className="text-gray-600 mt-2">Enter the OTP sent to {phone}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Change Phone Number
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Step
  if (!application) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Application Status</h1>
            <p className="text-sm text-gray-500">#{application.applicationNumber}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-800">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Application Progress</h2>
          <div className="flex items-center justify-between">
            {statusSteps.map((s, index) => (
              <div key={s.key} className="flex-1 flex flex-col items-center relative">
                {index < statusSteps.length - 1 && (
                  <div className={`absolute top-4 left-1/2 w-full h-1 ${
                    index < currentStatusIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStatusIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {index < currentStatusIndex ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : index === currentStatusIndex ? (
                    <ClockIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                <span className={`mt-2 text-xs text-center ${
                  index <= currentStatusIndex ? 'text-green-600 font-medium' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Status Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <AcademicCapIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Current Status</p>
              <p className="text-xl font-bold">{formatStatus(application.status)}</p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Info */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Student Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{application.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{application.studentPhone}</span>
              </div>
              {application.studentEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{application.studentEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fee Details */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Fee Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Fee</span>
                <span className="font-medium">{formatCurrency(application.totalFee)}</span>
              </div>
              {application.scholarshipAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Scholarship</span>
                  <span>-{formatCurrency(application.scholarshipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net Payable</span>
                <span>{formatCurrency(application.netFee)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span>{formatCurrency(application.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-orange-600">
                <span>Balance Due</span>
                <span>{formatCurrency(application.netFee - application.paidAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.documentName}</p>
                      <p className="text-sm text-gray-500">{doc.documentType}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'VERIFIED'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Payments</h3>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CurrencyRupeeIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-500">
                        {payment.paymentMode.replace(/_/g, ' ')} | {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'VERIFIED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrackApplicationPage;
