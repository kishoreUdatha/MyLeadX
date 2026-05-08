import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  BanknotesIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ApplicationDetail {
  id: string;
  applicationNumber: string;
  status: string;
  createdAt: string;
  student: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    fatherName: string;
    address: string;
  };
  course: {
    university: string;
    collegeName: string;
    courseName: string;
    academicYear: string;
  };
  fees: {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
  };
  commission: {
    rate: number;
    amount: number;
    status: string; // PENDING, APPROVED, PAID
  };
  collegeSubmission: {
    isSubmitted: boolean;
    submittedAt: string | null;
    collegeRefNumber: string | null;
    portalUrl: string | null;
  };
  documents: Array<{
    id: string;
    name: string;
    status: string;
    uploadedAt: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    mode: string;
    status: string;
    paidAt: string;
    transactionId: string;
  }>;
}

// Mock data for demo
const mockApplication: ApplicationDetail = {
  id: '1',
  applicationNumber: 'APP-2024-001234',
  status: 'DOCUMENT_VERIFICATION',
  createdAt: '2024-01-15T10:30:00',
  student: {
    name: 'Rahul Kumar',
    email: 'rahul.kumar@email.com',
    phone: '+91 98765 43210',
    dateOfBirth: '2000-05-15',
    gender: 'Male',
    fatherName: 'Suresh Kumar',
    address: '123, Sector 15, Noida, UP - 201301',
  },
  course: {
    university: 'MIT University',
    collegeName: 'MIT College of Engineering',
    courseName: 'B.Tech Computer Science',
    academicYear: '2024-25',
  },
  fees: {
    totalFee: 330000,
    paidAmount: 50000,
    pendingAmount: 280000,
  },
  commission: {
    rate: 10,
    amount: 33000,
    status: 'PENDING',
  },
  collegeSubmission: {
    isSubmitted: false,
    submittedAt: null,
    collegeRefNumber: null,
    portalUrl: 'https://admissions.mituniversity.edu',
  },
  documents: [
    { id: '1', name: '10th Marksheet', status: 'APPROVED', uploadedAt: '2024-01-15' },
    { id: '2', name: '12th Marksheet', status: 'APPROVED', uploadedAt: '2024-01-15' },
    { id: '3', name: 'Aadhar Card', status: 'PENDING', uploadedAt: '2024-01-16' },
  ],
  payments: [
    { id: '1', amount: 50000, mode: 'COLLEGE_PORTAL', status: 'VERIFIED', paidAt: '2024-01-16', transactionId: 'TXN123456' },
  ],
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: <ClockIcon className="w-4 h-4" />, label: 'Draft' },
  APPLICATION_SUBMITTED: { color: 'bg-blue-100 text-blue-700', icon: <DocumentTextIcon className="w-4 h-4" />, label: 'Submitted' },
  DOCUMENT_VERIFICATION: { color: 'bg-yellow-100 text-yellow-700', icon: <ClockIcon className="w-4 h-4" />, label: 'Verifying Docs' },
  SUBMITTED_TO_COLLEGE: { color: 'bg-indigo-100 text-indigo-700', icon: <ArrowTopRightOnSquareIcon className="w-4 h-4" />, label: 'Sent to College' },
  COLLEGE_PAYMENT_PENDING: { color: 'bg-orange-100 text-orange-700', icon: <CreditCardIcon className="w-4 h-4" />, label: 'Awaiting Payment' },
  COLLEGE_PAYMENT_MADE: { color: 'bg-emerald-100 text-emerald-700', icon: <BanknotesIcon className="w-4 h-4" />, label: 'Payment Made' },
  UNIVERSITY_PROCESSING: { color: 'bg-purple-100 text-purple-700', icon: <ClockIcon className="w-4 h-4" />, label: 'Processing' },
  ADMISSION_CONFIRMED: { color: 'bg-green-100 text-green-700', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Admitted!' },
  REJECTED: { color: 'bg-red-100 text-red-700', icon: <ExclamationTriangleIcon className="w-4 h-4" />, label: 'Rejected' },
};

export const AdmissionPartnerApplicationDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'payments'>('details');

  // Modals
  const [showCollegeSubmitModal, setShowCollegeSubmitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [collegeRefNumber, setCollegeRefNumber] = useState('');
  const [paymentData, setPaymentData] = useState({
    source: 'COLLEGE_PORTAL',
    amount: '',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    proofFile: null as File | null,
  });

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      // In real app, fetch from API
      // const response = await fetch(`/api/partner-portal/applications/${id}`);
      setApplication(mockApplication);
    } catch (error) {
      toast.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Export as PDF
  const handleExportPDF = () => {
    if (!application) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Application - ${application.applicationNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
              h2 { color: #4F46E5; margin-top: 30px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .label { color: #666; }
              .value { font-weight: 600; }
              @media print { button { display: none; } }
            </style>
          </head>
          <body>
            <h1>Application: ${application.applicationNumber}</h1>
            <h2>Student Information</h2>
            <div class="row"><span class="label">Name</span><span class="value">${application.student.name}</span></div>
            <div class="row"><span class="label">Email</span><span class="value">${application.student.email}</span></div>
            <div class="row"><span class="label">Phone</span><span class="value">${application.student.phone}</span></div>
            <div class="row"><span class="label">Father's Name</span><span class="value">${application.student.fatherName}</span></div>
            <h2>Course Details</h2>
            <div class="row"><span class="label">University</span><span class="value">${application.course.university}</span></div>
            <div class="row"><span class="label">Course</span><span class="value">${application.course.courseName}</span></div>
            <div class="row"><span class="label">Academic Year</span><span class="value">${application.course.academicYear}</span></div>
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">Print / Save as PDF</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Mark submitted to college
  const handleMarkSubmitted = () => {
    // API call to mark as submitted
    toast.success('Marked as submitted to college');
    setShowCollegeSubmitModal(false);
  };

  // Record payment
  const handleRecordPayment = () => {
    // API call to record payment
    toast.success('Payment recorded successfully');
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Application not found</p>
      </div>
    );
  }

  const status = statusConfig[application.status] || statusConfig.DRAFT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admission-partner/applications')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{application.applicationNumber}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-gray-600">Applied on {formatDate(application.createdAt)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>

          {!application.collegeSubmission.isSubmitted && (
            <button
              onClick={() => setShowCollegeSubmitModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Submit to College
            </button>
          )}

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm"
          >
            <BanknotesIcon className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{application.student.name}</p>
              <p className="text-sm text-gray-500">{application.student.phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{application.course.courseName}</p>
              <p className="text-sm text-gray-500">{application.course.university}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{formatCurrency(application.fees.paidAmount)}</p>
              <p className="text-sm text-gray-500">of {formatCurrency(application.fees.totalFee)} paid</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{formatCurrency(application.commission.amount)}</p>
              <p className="text-sm text-gray-500">Your Commission ({application.commission.rate}%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Status Banner */}
      <div className={`rounded-xl p-4 ${
        application.commission.status === 'PAID' ? 'bg-green-50 border border-green-200' :
        application.commission.status === 'APPROVED' ? 'bg-blue-50 border border-blue-200' :
        'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BanknotesIcon className={`w-6 h-6 ${
              application.commission.status === 'PAID' ? 'text-green-600' :
              application.commission.status === 'APPROVED' ? 'text-blue-600' :
              'text-yellow-600'
            }`} />
            <div>
              <p className="font-medium text-gray-900">Commission: {formatCurrency(application.commission.amount)}</p>
              <p className="text-sm text-gray-600">
                {application.commission.status === 'PAID' && 'Paid to your wallet'}
                {application.commission.status === 'APPROVED' && 'Approved - Will be paid soon'}
                {application.commission.status === 'PENDING' && 'Will be approved after admission confirmation'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            application.commission.status === 'PAID' ? 'bg-green-100 text-green-700' :
            application.commission.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {application.commission.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b">
          <nav className="flex gap-1 p-1">
            {[
              { id: 'details', label: 'Details', icon: <UserIcon className="w-4 h-4" /> },
              { id: 'documents', label: 'Documents', icon: <DocumentTextIcon className="w-4 h-4" /> },
              { id: 'payments', label: 'Payments', icon: <CreditCardIcon className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name</span>
                    <span className="font-medium">{application.student.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email</span>
                    <span className="font-medium">{application.student.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-medium">{application.student.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Father's Name</span>
                    <span className="font-medium">{application.student.fatherName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth</span>
                    <span className="font-medium">{formatDate(application.student.dateOfBirth)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">University</span>
                    <span className="font-medium">{application.course.university}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">College</span>
                    <span className="font-medium">{application.course.collegeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Course</span>
                    <span className="font-medium">{application.course.courseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Academic Year</span>
                    <span className="font-medium">{application.course.academicYear}</span>
                  </div>
                </div>

                {/* College Portal Link */}
                {application.collegeSubmission.portalUrl && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">College Admission Portal</p>
                    <a
                      href={application.collegeSubmission.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                    >
                      {application.collegeSubmission.portalUrl}
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Breakdown</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Total Fee</span>
                    <span className="font-bold text-lg">{formatCurrency(application.fees.totalFee)}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full mb-3">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(application.fees.paidAmount / application.fees.totalFee) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Paid: {formatCurrency(application.fees.paidAmount)}</span>
                    <span className="text-orange-600">Pending: {formatCurrency(application.fees.pendingAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {application.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">Uploaded {formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {application.payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCardIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No payments recorded yet</p>
                </div>
              ) : (
                application.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <BanknotesIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {payment.mode.replace('_', ' ')} • {formatDate(payment.paidAt)}
                          {payment.transactionId && ` • ${payment.transactionId}`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      payment.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                ))
              )}

              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600"
              >
                <BanknotesIcon className="w-5 h-5" />
                Record New Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit to College Modal */}
      {showCollegeSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit to College</h3>
            <p className="text-sm text-gray-500 mb-4">
              After submitting this application to the college portal, enter the reference number.
            </p>

            {application.collegeSubmission.portalUrl && (
              <a
                href={application.collegeSubmission.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 mb-4"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                Open College Portal
              </a>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College Reference Number *
              </label>
              <input
                type="text"
                value={collegeRefNumber}
                onChange={(e) => setCollegeRefNumber(e.target.value)}
                placeholder="e.g., MIT-2024-12345"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCollegeSubmitModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkSubmitted}
                disabled={!collegeRefNumber.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Mark Submitted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">
              Record a payment made by the student (either to college directly or through you).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Made Via</label>
                <select
                  value={paymentData.source}
                  onChange={(e) => setPaymentData({ ...paymentData, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="COLLEGE_PORTAL">Paid on College Portal</option>
                  <option value="COLLEGE_BANK">Bank Transfer to College</option>
                  <option value="COLLEGE_CASH">Cash at College</option>
                  <option value="PARTNER_COLLECTED">Collected by Me (Partner)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                <input
                  type="text"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="TXN123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Proof</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPaymentData({ ...paymentData, proofFile: e.target.files?.[0] || null })}
                    className="hidden"
                    id="paymentProofPartner"
                  />
                  <label htmlFor="paymentProofPartner" className="cursor-pointer flex flex-col items-center">
                    <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mb-2" />
                    {paymentData.proofFile ? (
                      <span className="text-green-600 text-sm">{paymentData.proofFile.name}</span>
                    ) : (
                      <span className="text-gray-500 text-sm">Click to upload screenshot/receipt</span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!paymentData.amount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionPartnerApplicationDetailPage;
