/**
 * Admission Tracker Components
 * - AdmissionStatusTracker: Visual progress tracker for admission journey
 * - CloseAdmissionModal: Modal for closing/creating admission records (supports all industries)
 */

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XMarkIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { admissionStatusOptions, admissionTypeOptions, getAdmissionStatusInfo } from '../lead-detail.constants';
import { admissionService, CreateAdmissionInput } from '../../../services/admission.service';
import { universityService, University } from '../../../services/university.service';
import { leadService } from '../../../services/lead.service';
import { OrganizationIndustry, getIndustryConfig } from '../industry-stages.constants';
import toast from 'react-hot-toast';

interface AdmissionStatusTrackerProps {
  currentStatus: string;
  onStatusChange: (status: string) => Promise<void>;
  onCloseAdmission: () => void;
  isConverted?: boolean;
  admissionClosedAt?: string;
}

export function AdmissionStatusTracker({
  currentStatus,
  onStatusChange,
  onCloseAdmission,
  isConverted,
  admissionClosedAt,
}: AdmissionStatusTrackerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatusInfo = getAdmissionStatusInfo(currentStatus);
  const currentStep = currentStatusInfo.step;

  // Filter out DROPPED for the progress tracker (show it separately)
  const progressStatuses = admissionStatusOptions.filter(s => s.step > 0);

  const handleStatusClick = async (status: string) => {
    if (isUpdating || status === currentStatus) return;

    // Prevent going backwards from ADMITTED/ENROLLED
    if ((currentStatus === 'ADMITTED' || currentStatus === 'ENROLLED') &&
        getAdmissionStatusInfo(status).step < currentStep) {
      toast.error('Cannot move back from admitted/enrolled status');
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(status);
      toast.success(`Status updated to ${getAdmissionStatusInfo(status).label}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const canCloseAdmission = ['PAYMENT_PENDING', 'ADMITTED'].includes(currentStatus);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Admission Journey</h3>
        </div>
        <div className="flex items-center gap-2">
          {currentStatus === 'DROPPED' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              Dropped
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${currentStatusInfo.color}`}>
              {currentStatusInfo.label}
            </span>
          )}
          {admissionClosedAt && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircleSolidIcon className="h-3.5 w-3.5" />
              Admission Closed
            </span>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {progressStatuses.map((status, index) => {
            const isCompleted = status.step < currentStep;
            const isCurrent = status.value === currentStatus;
            const isClickable = !isUpdating && status.step <= currentStep + 1;

            return (
              <div key={status.value} className="flex items-center flex-1">
                <button
                  onClick={() => handleStatusClick(status.value)}
                  disabled={!isClickable}
                  className={`relative flex flex-col items-center group ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  title={status.label}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                        : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircleSolidIcon className="h-5 w-5" />
                    ) : (
                      status.step
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-medium text-center max-w-[60px] leading-tight ${
                      isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                    }`}
                  >
                    {status.label}
                  </span>
                </button>
                {index < progressStatuses.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      status.step < currentStep ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {currentStatus !== 'DROPPED' && currentStatus !== 'ENROLLED' && (
            <button
              onClick={() => handleStatusClick('DROPPED')}
              disabled={isUpdating}
              className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
            >
              Mark as Dropped
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCloseAdmission && !admissionClosedAt && (
            <button
              onClick={onCloseAdmission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              <AcademicCapIcon className="h-4 w-4" />
              Close Admission
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CloseAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
  industry?: OrganizationIndustry;
}

export function CloseAdmissionModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
  industry = 'GENERAL',
}: CloseAdmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);

  const industryConfig = getIndustryConfig(industry);
  const isEducation = industry === 'EDUCATION';

  const currentYear = new Date().getFullYear();
  const academicYearOptions = [
    `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
    `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
  ];

  // Education-specific form data
  const [formData, setFormData] = useState<CreateAdmissionInput>({
    leadId: leadId,
    universityId: '',
    academicYear: academicYearOptions[0],
    admissionType: 'NON_DONATION',
    totalFee: 0,
    commissionPercent: 10,
    courseName: '',
    branch: '',
    donationAmount: 0,
  });

  // Generic deal form data (for non-education industries)
  const [dealData, setDealData] = useState({
    dealValue: 0,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, leadId, universityId: '' }));
      setDealData({ dealValue: 0, notes: '' });
      setError(null);
      if (isEducation) {
        loadUniversities();
      }
    }
  }, [isOpen, leadId, isEducation]);

  const loadUniversities = async () => {
    try {
      setLoadingUniversities(true);
      const result = await universityService.getAll({ isActive: true, limit: 100 });
      setUniversities(result.universities);
    } catch (err) {
      console.error('Failed to load universities:', err);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate before setting submitting state
    if (isEducation) {
      if (!formData.universityId) {
        setError('Please select a university');
        return;
      }
      if (formData.totalFee <= 0) {
        setError('Total fee must be greater than 0');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (isEducation) {
        // Education: Create admission record
        await admissionService.create(formData);
        toast.success('Admission closed successfully!');
      } else {
        // Other industries: Mark lead as converted with deal value
        if (dealData.dealValue <= 0) {
          setError('Please enter a deal value');
          setIsSubmitting(false);
          return;
        }
        await leadService.update(leadId, {
          isConverted: true,
          actualValue: dealData.dealValue,
        });
        toast.success(`${industryConfig.wonLabel} - Deal closed successfully!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to close deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commissionAmount = (formData.totalFee * formData.commissionPercent) / 100;

  if (!isOpen) return null;

  // Get dynamic labels based on industry
  const getModalTitle = () => {
    if (isEducation) return 'Close Admission';
    return `Close ${industryConfig.journeyTitle.split(' ')[0]}`;
  };

  const getModalSubtitle = () => {
    if (isEducation) return `Creating admission for ${leadName}`;
    return `Mark as ${industryConfig.wonLabel} for ${leadName}`;
  };

  const getButtonLabel = () => {
    if (isEducation) return 'Close Admission';
    return `Mark as ${industryConfig.wonLabel}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${industryConfig.color}15` }}
            >
              {isEducation ? (
                <AcademicCapIcon className="h-5 w-5" style={{ color: industryConfig.color }} />
              ) : (
                <CurrencyRupeeIcon className="h-5 w-5" style={{ color: industryConfig.color }} />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{getModalTitle()}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{getModalSubtitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* ========== EDUCATION SPECIFIC FORM ========== */}
          {isEducation && (
            <>
              {/* University Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  University <span className="text-red-500">*</span>
                </label>
                {loadingUniversities ? (
                  <div className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    Loading universities...
                  </div>
                ) : universities.length === 0 ? (
                  <div className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                    No universities found. Please create a university first from the Universities page.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.universityId || ''}
                    onChange={(e) => {
                      const selectedUniv = universities.find(u => u.id === e.target.value);
                      setFormData({
                        ...formData,
                        universityId: e.target.value,
                        commissionPercent: selectedUniv?.defaultCommissionPercent ?? formData.commissionPercent
                      });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    <option value="">Select a university</option>
                    {universities.map((univ) => (
                      <option key={univ.id} value={univ.id}>
                        {univ.name} {univ.city ? `(${univ.city})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Course & Branch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
                  <input
                    type="text"
                    value={formData.courseName}
                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., B.Tech, MBA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., CSE, ECE"
                  />
                </div>
              </div>

              {/* Academic Year & Admission Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Admission Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.admissionType}
                    onChange={(e) => setFormData({ ...formData, admissionType: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    {admissionTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Fee (INR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.totalFee || ''}
                    onChange={(e) => setFormData({ ...formData, totalFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., 500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Commission % <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.commissionPercent || ''}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              {/* Donation (if applicable) */}
              {formData.admissionType === 'DONATION' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Donation Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.donationAmount || ''}
                    onChange={(e) => setFormData({ ...formData, donationAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                    placeholder="e.g., 100000"
                  />
                </div>
              )}

              {/* Summary for Education */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-500">Total Fee:</div>
                  <div className="font-medium text-slate-900 text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(formData.totalFee)}
                  </div>
                  {(formData.donationAmount ?? 0) > 0 && (
                    <>
                      <div className="text-slate-500">Donation:</div>
                      <div className="font-medium text-purple-600 text-right">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(formData.donationAmount ?? 0)}
                      </div>
                    </>
                  )}
                  <div className="text-slate-500">Commission ({formData.commissionPercent}%):</div>
                  <div className="font-medium text-emerald-600 text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(commissionAmount)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========== GENERIC FORM FOR OTHER INDUSTRIES ========== */}
          {!isEducation && (
            <>
              {/* Deal Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deal Value (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={dealData.dealValue || ''}
                  onChange={(e) => setDealData({ ...dealData, dealValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="Enter deal value"
                />
                <p className="text-xs text-slate-500 mt-1">Enter the value of this deal</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={dealData.notes}
                  onChange={(e) => setDealData({ ...dealData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                  placeholder="Add any notes about this deal closure..."
                />
              </div>

              {/* Summary for Generic */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Confirmation</h4>
                <p className="text-sm text-slate-600">
                  This will mark <strong>{leadName}</strong> as <strong style={{ color: industryConfig.color }}>{industryConfig.wonLabel}</strong>.
                </p>
                {dealData.dealValue > 0 && (
                  <p className="text-sm text-slate-600 mt-1">
                    Deal Value: <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dealData.dealValue)}</strong>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: industryConfig.color }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircleSolidIcon className="h-4 w-4" />
                  {getButtonLabel()}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
