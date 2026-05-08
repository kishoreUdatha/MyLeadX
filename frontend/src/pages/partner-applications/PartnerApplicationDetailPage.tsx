import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Building, GraduationCap, FileText, CreditCard, MessageSquare,
  CheckCircle, XCircle, Clock, AlertTriangle, Download, Eye, Upload, Send,
  Phone, Mail, MapPin, Calendar, Users, Wallet, Edit, MoreHorizontal,
  FileCheck, DollarSign, UserCheck, History, FileDown, ExternalLink, Printer
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUESTED';
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  remarks?: string;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  mode: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  paidAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  transactionId?: string;
  proofUrl?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  performedAt: string;
}

const mockApplication = {
  id: '1',
  applicationNumber: 'APP-2024-001234',
  status: 'DOCUMENT_VERIFICATION',
  appliedAt: '2024-01-15T10:30:00',
  lastUpdated: '2024-01-18T14:45:00',
  student: {
    name: 'Rahul Kumar',
    email: 'rahul.kumar@email.com',
    phone: '+91 98765 43210',
    alternatePhone: '+91 87654 32109',
    dateOfBirth: '2000-05-15',
    gender: 'Male',
    address: '123, Sector 15, Noida, Uttar Pradesh - 201301',
    fatherName: 'Suresh Kumar',
    fatherPhone: '+91 76543 21098',
    motherName: 'Sunita Kumar',
  },
  course: {
    university: 'MIT University',
    name: 'B.Tech Computer Science',
    duration: '4 Years',
    intake: 'August 2024',
    campus: 'Main Campus, Pune',
  },
  partner: {
    id: 'p1',
    name: 'Premier Education Partners',
    type: 'SUPER_PARTNER',
    phone: '+91 98765 00000',
    email: 'info@premier-edu.com',
    commissionRate: 10,
  },
  counsellor: {
    id: 'c1',
    name: 'Priya Sharma',
    email: 'priya@company.com',
    phone: '+91 99999 88888',
  },
  fees: {
    admissionFee: 50000,
    tuitionFee: 200000,
    hostelFee: 80000,
    totalFee: 330000,
    paidAmount: 50000,
    pendingAmount: 280000,
  },
  commission: {
    totalCommission: 33000,
    pendingCommission: 28000,
    paidCommission: 5000,
    status: 'PARTIAL',
  },
};

const mockDocuments: Document[] = [
  { id: '1', name: '10th Marksheet', type: 'ACADEMIC', status: 'APPROVED', uploadedAt: '2024-01-15', verifiedBy: 'Admin', verifiedAt: '2024-01-16' },
  { id: '2', name: '12th Marksheet', type: 'ACADEMIC', status: 'APPROVED', uploadedAt: '2024-01-15', verifiedBy: 'Admin', verifiedAt: '2024-01-16' },
  { id: '3', name: 'Aadhar Card', type: 'IDENTITY', status: 'PENDING', uploadedAt: '2024-01-17' },
  { id: '4', name: 'Passport Photo', type: 'PHOTO', status: 'RESUBMISSION_REQUESTED', uploadedAt: '2024-01-15', remarks: 'Photo is not clear, please upload high resolution photo' },
  { id: '5', name: 'Address Proof', type: 'ADDRESS', status: 'PENDING', uploadedAt: '2024-01-17' },
];

const mockPayments: Payment[] = [
  { id: '1', type: 'Registration Fee', amount: 5000, mode: 'ONLINE_CRM', status: 'VERIFIED', paidAt: '2024-01-15', transactionId: 'TXN123456', verifiedBy: 'Admin', verifiedAt: '2024-01-15' },
  { id: '2', type: 'Admission Fee (Partial)', amount: 45000, mode: 'BANK_TRANSFER', status: 'VERIFIED', paidAt: '2024-01-16', proofUrl: '/proof.pdf', verifiedBy: 'Admin', verifiedAt: '2024-01-17' },
];

const mockActivityLogs: ActivityLog[] = [
  { id: '1', action: 'PAYMENT_VERIFIED', description: 'Payment of ₹45,000 verified', performedBy: 'Admin', performedAt: '2024-01-17T15:30:00' },
  { id: '2', action: 'DOCUMENT_REJECTED', description: 'Passport Photo rejected - not clear', performedBy: 'Admin', performedAt: '2024-01-16T11:20:00' },
  { id: '3', action: 'DOCUMENTS_VERIFIED', description: '10th and 12th Marksheets verified', performedBy: 'Admin', performedAt: '2024-01-16T10:00:00' },
  { id: '4', action: 'COUNSELLOR_ASSIGNED', description: 'Priya Sharma assigned as counsellor', performedBy: 'System', performedAt: '2024-01-15T12:00:00' },
  { id: '5', action: 'APPLICATION_SUBMITTED', description: 'Application submitted by partner', performedBy: 'Premier Education Partners', performedAt: '2024-01-15T10:30:00' },
];

const statusOptions = [
  'APPLICATION_SUBMITTED',
  'DOCUMENT_VERIFICATION',
  'PAYMENT_PENDING',
  'SUBMITTED_TO_COLLEGE',  // Application submitted to college portal
  'COLLEGE_PAYMENT_PENDING', // Waiting for student to pay college directly
  'COLLEGE_PAYMENT_MADE', // Student paid college directly
  'UNIVERSITY_PROCESSING',
  'ADMISSION_CONFIRMED',
  'ENROLLMENT_COMPLETE',
  'REJECTED',
];

// Payment sources
const paymentSources = [
  { value: 'CRM_ONLINE', label: 'Online via CRM (Razorpay)' },
  { value: 'COLLEGE_PORTAL', label: 'Paid on College Portal' },
  { value: 'COLLEGE_BANK', label: 'Bank Transfer to College' },
  { value: 'COLLEGE_CASH', label: 'Cash at College' },
  { value: 'COLLEGE_DD', label: 'Demand Draft to College' },
];

// College submission info (would come from API)
const mockCollegeSubmission = {
  submissionMethod: 'ONLINE_PORTAL', // ONLINE_PORTAL, EMAIL, IN_PERSON, COURIER
  portalUrl: 'https://admissions.mituniversity.edu/apply',
  portalEmail: 'admissions@mituniversity.edu',
  instructions: 'Login to portal, go to Applications > New Application, fill all fields and upload documents.',
  submittedAt: null as string | null,
  submittedBy: null as string | null,
  collegeRefNumber: null as string | null,
};

export function PartnerApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'payments' | 'communication' | 'activity'>('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCollegeSubmitModal, setShowCollegeSubmitModal] = useState(false);
  const [collegeRefNumber, setCollegeRefNumber] = useState('');
  const [documentAction, setDocumentAction] = useState<{ doc: Document; action: 'approve' | 'reject' | 'request_resubmit' } | null>(null);

  // External Payment Modal
  const [showExternalPaymentModal, setShowExternalPaymentModal] = useState(false);
  const [externalPayment, setExternalPayment] = useState({
    source: 'COLLEGE_PORTAL',
    amount: '',
    transactionId: '',
    portalRefNo: '',
    paymentDate: new Date().toISOString().split('T')[0],
    proofFile: null as File | null,
    remarks: '',
  });

  // Admission Confirmation Modal
  const [showAdmissionConfirmModal, setShowAdmissionConfirmModal] = useState(false);
  const [admissionDetails, setAdmissionDetails] = useState({
    universityAppNo: '',
    universityRollNo: '',
    admissionLetter: null as File | null,
    remarks: '',
  });

  // Export application as PDF
  const handleExportPDF = () => {
    // In real implementation, call API to generate PDF
    const printContent = `
      APPLICATION FORM - ${mockApplication.applicationNumber}
      ========================================

      STUDENT INFORMATION
      -------------------
      Name: ${mockApplication.student.name}
      Email: ${mockApplication.student.email}
      Phone: ${mockApplication.student.phone}
      Date of Birth: ${mockApplication.student.dateOfBirth}
      Gender: ${mockApplication.student.gender}
      Father's Name: ${mockApplication.student.fatherName}
      Address: ${mockApplication.student.address}

      COURSE DETAILS
      --------------
      University: ${mockApplication.course.university}
      Course: ${mockApplication.course.name}
      Duration: ${mockApplication.course.duration}
      Intake: ${mockApplication.course.intake}
      Campus: ${mockApplication.course.campus}

      FEE DETAILS
      -----------
      Total Fee: ${mockApplication.fees.totalFee}
      Paid Amount: ${mockApplication.fees.paidAmount}
      Pending: ${mockApplication.fees.pendingAmount}
    `;

    // Create printable window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Application - ${mockApplication.applicationNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
              h2 { color: #4F46E5; margin-top: 30px; }
              .section { margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .label { color: #666; }
              .value { font-weight: 600; }
              @media print { button { display: none; } }
            </style>
          </head>
          <body>
            <h1>Application Form - ${mockApplication.applicationNumber}</h1>

            <h2>Student Information</h2>
            <div class="section">
              <div class="row"><span class="label">Name</span><span class="value">${mockApplication.student.name}</span></div>
              <div class="row"><span class="label">Email</span><span class="value">${mockApplication.student.email}</span></div>
              <div class="row"><span class="label">Phone</span><span class="value">${mockApplication.student.phone}</span></div>
              <div class="row"><span class="label">Date of Birth</span><span class="value">${mockApplication.student.dateOfBirth}</span></div>
              <div class="row"><span class="label">Gender</span><span class="value">${mockApplication.student.gender}</span></div>
              <div class="row"><span class="label">Father's Name</span><span class="value">${mockApplication.student.fatherName}</span></div>
              <div class="row"><span class="label">Address</span><span class="value">${mockApplication.student.address}</span></div>
            </div>

            <h2>Course Details</h2>
            <div class="section">
              <div class="row"><span class="label">University</span><span class="value">${mockApplication.course.university}</span></div>
              <div class="row"><span class="label">Course</span><span class="value">${mockApplication.course.name}</span></div>
              <div class="row"><span class="label">Duration</span><span class="value">${mockApplication.course.duration}</span></div>
              <div class="row"><span class="label">Intake</span><span class="value">${mockApplication.course.intake}</span></div>
              <div class="row"><span class="label">Campus</span><span class="value">${mockApplication.course.campus}</span></div>
            </div>

            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">Print / Save as PDF</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Export application as Excel/CSV
  const handleExportExcel = () => {
    const csvContent = [
      ['Application Number', mockApplication.applicationNumber],
      ['Status', mockApplication.status],
      ['Applied Date', mockApplication.appliedAt],
      [''],
      ['STUDENT INFORMATION'],
      ['Name', mockApplication.student.name],
      ['Email', mockApplication.student.email],
      ['Phone', mockApplication.student.phone],
      ['Date of Birth', mockApplication.student.dateOfBirth],
      ['Gender', mockApplication.student.gender],
      ["Father's Name", mockApplication.student.fatherName],
      ['Address', mockApplication.student.address],
      [''],
      ['COURSE DETAILS'],
      ['University', mockApplication.course.university],
      ['Course', mockApplication.course.name],
      ['Duration', mockApplication.course.duration],
      ['Intake', mockApplication.course.intake],
      [''],
      ['FEE DETAILS'],
      ['Total Fee', mockApplication.fees.totalFee.toString()],
      ['Paid Amount', mockApplication.fees.paidAmount.toString()],
      ['Pending Amount', mockApplication.fees.pendingAmount.toString()],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Application_${mockApplication.applicationNumber}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Mark as submitted to college
  const handleMarkSubmittedToCollege = () => {
    // In real implementation, call API to update status
    console.log('Marked as submitted to college with ref:', collegeRefNumber);
    setShowCollegeSubmitModal(false);
    // Would update the application status to SUBMITTED_TO_COLLEGE
  };

  // Record external payment (paid directly to college)
  const handleRecordExternalPayment = () => {
    // In real implementation, call API to record the payment
    console.log('Recording external payment:', externalPayment);
    // API call: POST /api/partner-applications/:id/payments
    // {
    //   paymentMode: externalPayment.source,
    //   amount: externalPayment.amount,
    //   transactionId: externalPayment.transactionId,
    //   portalReferenceNo: externalPayment.portalRefNo,
    //   paymentDate: externalPayment.paymentDate,
    //   proofUrl: uploaded file URL,
    //   submittedBy: 'ADMIN', // or PARTNER
    //   remarks: externalPayment.remarks
    // }
    setShowExternalPaymentModal(false);
    setExternalPayment({
      source: 'COLLEGE_PORTAL',
      amount: '',
      transactionId: '',
      portalRefNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      proofFile: null,
      remarks: '',
    });
    // Would update application payment status
  };

  // Confirm admission from college
  const handleConfirmAdmission = () => {
    // In real implementation, call API
    console.log('Confirming admission:', admissionDetails);
    // API call: PATCH /api/partner-applications/:id
    // {
    //   status: 'ADMISSION_CONFIRMED',
    //   universityAppNo: admissionDetails.universityAppNo,
    //   universityRollNo: admissionDetails.universityRollNo,
    //   admissionConfirmedAt: new Date()
    // }
    setShowAdmissionConfirmModal(false);
    // This triggers commission calculation for partner
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const docStatusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    REJECTED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    RESUBMISSION_REQUESTED: { color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="w-3 h-3" /> },
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity Log', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/partner-applications')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{mockApplication.applicationNumber}</h1>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                Document Verification
              </span>
            </div>
            <p className="text-slate-600">Applied on {formatDate(mockApplication.appliedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <FileDown className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
              >
                <Printer className="w-4 h-4" />
                Print / PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 last:rounded-b-lg"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          </div>

          {/* Submit to College Button */}
          <button
            onClick={() => setShowCollegeSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <ExternalLink className="w-4 h-4" />
            Submit to College
          </button>

          {/* Record College Payment */}
          <button
            onClick={() => setShowExternalPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
          >
            <CreditCard className="w-4 h-4" />
            Record College Payment
          </button>

          {/* Confirm Admission */}
          <button
            onClick={() => setShowAdmissionConfirmModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Admission
          </button>

          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Edit className="w-4 h-4" />
            Update Status
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Send className="w-4 h-4" />
            Send Notification
          </button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{mockApplication.student.name}</p>
              <p className="text-sm text-slate-500">{mockApplication.student.phone}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{mockApplication.course.university}</p>
              <p className="text-sm text-slate-500">{mockApplication.course.name}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{mockApplication.partner.name}</p>
              <p className="text-sm text-slate-500">{mockApplication.partner.type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {formatCurrency(mockApplication.fees.paidAmount)} / {formatCurrency(mockApplication.fees.totalFee)}
              </p>
              <p className="text-sm text-slate-500">{Math.round((mockApplication.fees.paidAmount / mockApplication.fees.totalFee) * 100)}% Paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Student Information</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name</span>
                    <span className="font-medium text-slate-900">{mockApplication.student.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email</span>
                    <span className="font-medium text-slate-900">{mockApplication.student.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone</span>
                    <span className="font-medium text-slate-900">{mockApplication.student.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date of Birth</span>
                    <span className="font-medium text-slate-900">{formatDate(mockApplication.student.dateOfBirth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gender</span>
                    <span className="font-medium text-slate-900">{mockApplication.student.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Father's Name</span>
                    <span className="font-medium text-slate-900">{mockApplication.student.fatherName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Address</span>
                    <span className="font-medium text-slate-900 text-right max-w-xs">{mockApplication.student.address}</span>
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Course Information</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">University</span>
                    <span className="font-medium text-slate-900">{mockApplication.course.university}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Course</span>
                    <span className="font-medium text-slate-900">{mockApplication.course.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration</span>
                    <span className="font-medium text-slate-900">{mockApplication.course.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Intake</span>
                    <span className="font-medium text-slate-900">{mockApplication.course.intake}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Campus</span>
                    <span className="font-medium text-slate-900">{mockApplication.course.campus}</span>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Fee Breakdown</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Admission Fee</span>
                    <span className="font-medium text-slate-900">{formatCurrency(mockApplication.fees.admissionFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tuition Fee</span>
                    <span className="font-medium text-slate-900">{formatCurrency(mockApplication.fees.tuitionFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hostel Fee</span>
                    <span className="font-medium text-slate-900">{formatCurrency(mockApplication.fees.hostelFee)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="font-medium text-slate-900">Total Fee</span>
                    <span className="font-bold text-slate-900">{formatCurrency(mockApplication.fees.totalFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(mockApplication.fees.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">Pending Amount</span>
                    <span className="font-medium text-orange-600">{formatCurrency(mockApplication.fees.pendingAmount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </button>
              </div>

              {/* Partner & Commission */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Partner & Commission</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Partner Name</span>
                    <span className="font-medium text-slate-900">{mockApplication.partner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Partner Type</span>
                    <span className="font-medium text-slate-900">{mockApplication.partner.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Commission Rate</span>
                    <span className="font-medium text-slate-900">{mockApplication.partner.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="text-slate-600">Total Commission</span>
                    <span className="font-bold text-slate-900">{formatCurrency(mockApplication.commission.totalCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Paid Commission</span>
                    <span className="font-medium text-green-600">{formatCurrency(mockApplication.commission.paidCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">Pending Commission</span>
                    <span className="font-medium text-orange-600">{formatCurrency(mockApplication.commission.pendingCommission)}</span>
                  </div>
                </div>

                {/* Counsellor */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Assigned Counsellor</p>
                      {mockApplication.counsellor ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{mockApplication.counsellor.name}</p>
                            <p className="text-xs text-slate-500">{mockApplication.counsellor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mt-1">Not assigned</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {mockApplication.counsellor ? 'Change' : 'Assign'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {mockDocuments.filter(d => d.status === 'APPROVED').length} / {mockDocuments.length} Verified
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {mockDocuments.map((doc) => (
                  <div key={doc.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                          <FileText className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.name}</p>
                          <p className="text-sm text-slate-500">Uploaded on {formatDate(doc.uploadedAt)}</p>
                          {doc.remarks && (
                            <p className="text-sm text-orange-600 mt-1">{doc.remarks}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${docStatusConfig[doc.status]?.color}`}>
                          {docStatusConfig[doc.status]?.icon}
                          {doc.status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-slate-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          {doc.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => setDocumentAction({ doc, action: 'approve' })}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDocumentAction({ doc, action: 'reject' })}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDocumentAction({ doc, action: 'request_resubmit' })}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.verifiedBy && (
                      <p className="text-xs text-slate-500 mt-2 pl-14">
                        Verified by {doc.verifiedBy} on {formatDate(doc.verifiedAt!)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </button>
              </div>

              {/* Payment Progress */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Payment Progress</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatCurrency(mockApplication.fees.paidAmount)} / {formatCurrency(mockApplication.fees.totalFee)}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min((mockApplication.fees.paidAmount / mockApplication.fees.totalFee) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {Math.round((mockApplication.fees.paidAmount / mockApplication.fees.totalFee) * 100)}% paid - {formatCurrency(mockApplication.fees.pendingAmount)} remaining
                </p>
              </div>

              {/* Payment Records */}
              <div className="grid gap-4">
                {mockPayments.map((payment) => (
                  <div key={payment.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{payment.type}</p>
                          <p className="text-sm text-slate-500">
                            {payment.mode.replace('_', ' ')} • {formatDate(payment.paidAt)}
                            {payment.transactionId && ` • ${payment.transactionId}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(payment.amount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payment.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                            payment.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        {payment.proofUrl && (
                          <button className="p-2 text-slate-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {payment.verifiedBy && (
                      <p className="text-xs text-slate-500 mt-2 pl-14">
                        Verified by {payment.verifiedBy} on {formatDate(payment.verifiedAt!)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Communication History</h3>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Communication history will appear here</p>
                <p className="text-sm text-slate-500 mt-1">Send messages to student or partner to start a conversation</p>
              </div>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Activity Log</h3>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4">
                  {mockActivityLogs.map((log, index) => (
                    <div key={log.id} className="relative pl-12">
                      <div className="absolute left-3 w-4 h-4 bg-white border-2 border-primary-500 rounded-full" />
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900">{log.description}</p>
                          <p className="text-sm text-slate-500">{formatDateTime(log.performedAt)}</p>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">By {log.performedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Action Modal */}
      {documentAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {documentAction.action === 'approve' && 'Approve Document'}
              {documentAction.action === 'reject' && 'Reject Document'}
              {documentAction.action === 'request_resubmit' && 'Request Resubmission'}
            </h3>
            <p className="text-slate-600 mb-4">
              {documentAction.action === 'approve' && `Are you sure you want to approve "${documentAction.doc.name}"?`}
              {documentAction.action === 'reject' && `Are you sure you want to reject "${documentAction.doc.name}"?`}
              {documentAction.action === 'request_resubmit' && `Request student to resubmit "${documentAction.doc.name}"?`}
            </p>
            {(documentAction.action === 'reject' || documentAction.action === 'request_resubmit') && (
              <textarea
                placeholder="Enter reason / remarks..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4"
                rows={3}
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDocumentAction(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setDocumentAction(null)}
                className={`px-4 py-2 text-white rounded-lg ${
                  documentAction.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  documentAction.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit to College Modal */}
      {showCollegeSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Submit Application to College</h3>
            <p className="text-sm text-slate-500 mb-4">
              Since {mockApplication.course.university} doesn't have an API, follow these steps to submit manually.
            </p>

            {/* College Submission Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Submission Instructions</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="font-medium">Method:</span>
                  <span>{mockCollegeSubmission.submissionMethod.replace('_', ' ')}</span>
                </div>
                {mockCollegeSubmission.portalUrl && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium">Portal:</span>
                    <a
                      href={mockCollegeSubmission.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {mockCollegeSubmission.portalUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {mockCollegeSubmission.portalEmail && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium">Email:</span>
                    <a href={`mailto:${mockCollegeSubmission.portalEmail}`} className="text-blue-600 hover:underline">
                      {mockCollegeSubmission.portalEmail}
                    </a>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="font-medium">Steps:</span>
                  <span>{mockCollegeSubmission.instructions}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleExportPDF}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print Application
              </button>
              <button
                onClick={handleExportExcel}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
              >
                <Download className="w-4 h-4" />
                Download Data
              </button>
            </div>

            {/* Mark as Submitted */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-medium text-slate-900 mb-2">After Submitting to College</h4>
              <p className="text-sm text-slate-600 mb-3">
                Once you've submitted the application to the college, enter the reference number below to mark it as submitted.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    College Reference / Application Number
                  </label>
                  <input
                    type="text"
                    value={collegeRefNumber}
                    onChange={(e) => setCollegeRefNumber(e.target.value)}
                    placeholder="e.g., MIT-2024-12345"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCollegeSubmitModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkSubmittedToCollege}
                disabled={!collegeRefNumber.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Submitted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Payment Modal (Payment Made Directly to College) */}
      {showExternalPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Record College Payment</h3>
            <p className="text-sm text-slate-500 mb-4">
              Record a payment that was made directly to the college (not through our system).
            </p>

            <div className="space-y-4">
              {/* Payment Source */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Made Via *</label>
                <select
                  value={externalPayment.source}
                  onChange={(e) => setExternalPayment({ ...externalPayment, source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {paymentSources.filter(s => s.value !== 'CRM_ONLINE').map(source => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={externalPayment.amount}
                    onChange={(e) => setExternalPayment({ ...externalPayment, amount: e.target.value })}
                    placeholder="50000"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Transaction ID / Receipt No */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={externalPayment.transactionId}
                    onChange={(e) => setExternalPayment({ ...externalPayment, transactionId: e.target.value })}
                    placeholder="TXN123456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Portal Ref No</label>
                  <input
                    type="text"
                    value={externalPayment.portalRefNo}
                    onChange={(e) => setExternalPayment({ ...externalPayment, portalRefNo: e.target.value })}
                    placeholder="MIT-PAY-2024-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={externalPayment.paymentDate}
                  onChange={(e) => setExternalPayment({ ...externalPayment, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Proof (Screenshot/Receipt)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setExternalPayment({ ...externalPayment, proofFile: e.target.files?.[0] || null })}
                    className="hidden"
                    id="paymentProof"
                  />
                  <label htmlFor="paymentProof" className="cursor-pointer">
                    {externalPayment.proofFile ? (
                      <span className="text-green-600">{externalPayment.proofFile.name}</span>
                    ) : (
                      <span className="text-slate-500">Click to upload payment proof</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={externalPayment.remarks}
                  onChange={(e) => setExternalPayment({ ...externalPayment, remarks: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExternalPaymentModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordExternalPayment}
                disabled={!externalPayment.amount || !externalPayment.paymentDate}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admission Confirmation Modal */}
      {showAdmissionConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Admission</h3>
            <p className="text-sm text-slate-500 mb-4">
              Record the admission confirmation details from the college. This will trigger commission calculation for the partner.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Commission Impact</p>
                  <p className="text-sm text-green-700">
                    Partner commission of {formatCurrency(mockApplication.commission.totalCommission)} will become eligible for payout.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* University Application Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">University Application Number *</label>
                <input
                  type="text"
                  value={admissionDetails.universityAppNo}
                  onChange={(e) => setAdmissionDetails({ ...admissionDetails, universityAppNo: e.target.value })}
                  placeholder="e.g., MIT-2024-12345"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Roll Number (if available) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">University Roll Number (if issued)</label>
                <input
                  type="text"
                  value={admissionDetails.universityRollNo}
                  onChange={(e) => setAdmissionDetails({ ...admissionDetails, universityRollNo: e.target.value })}
                  placeholder="e.g., 2024CS001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Admission Letter Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admission Letter (Optional)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setAdmissionDetails({ ...admissionDetails, admissionLetter: e.target.files?.[0] || null })}
                    className="hidden"
                    id="admissionLetter"
                  />
                  <label htmlFor="admissionLetter" className="cursor-pointer">
                    {admissionDetails.admissionLetter ? (
                      <span className="text-green-600">{admissionDetails.admissionLetter.name}</span>
                    ) : (
                      <span className="text-slate-500">Click to upload admission letter</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={admissionDetails.remarks}
                  onChange={(e) => setAdmissionDetails({ ...admissionDetails, remarks: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdmissionConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdmission}
                disabled={!admissionDetails.universityAppNo}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
