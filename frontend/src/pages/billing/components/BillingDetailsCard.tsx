/**
 * BillingDetailsCard - Manage billing address and GSTIN for invoices
 */
import { useState } from 'react';
import {
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

interface BillingDetails {
  name?: string;
  email?: string;
  gstin?: string;
  billingAddress?: string;
}

interface BillingDetailsCardProps {
  details: BillingDetails | null;
  onUpdate: () => void;
}

export function BillingDetailsCard({ details, onUpdate }: BillingDetailsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gstin: details?.gstin || '',
    billingAddress: details?.billingAddress || '',
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.patch('/organization/billing-details', formData);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating billing details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      gstin: details?.gstin || '',
      billingAddress: details?.billingAddress || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <BuildingOfficeIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Billing Details</h3>
            <p className="text-sm text-slate-500">For invoices and tax purposes</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* GSTIN */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                15-character GST Identification Number
              </p>
            </div>

            {/* Billing Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Billing Address
              </label>
              <textarea
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="Enter your billing address..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                <CheckIcon className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <p className="text-sm text-slate-500">Company Name</p>
              <p className="font-medium text-slate-900">{details?.name || 'Not set'}</p>
            </div>

            {/* Email */}
            <div>
              <p className="text-sm text-slate-500">Billing Email</p>
              <p className="font-medium text-slate-900">{details?.email || 'Not set'}</p>
            </div>

            {/* GSTIN */}
            <div>
              <p className="text-sm text-slate-500">GSTIN</p>
              <p className="font-medium text-slate-900">
                {details?.gstin || <span className="text-slate-400">Not provided</span>}
              </p>
            </div>

            {/* Billing Address */}
            <div>
              <p className="text-sm text-slate-500">Billing Address</p>
              <p className="font-medium text-slate-900 whitespace-pre-line">
                {details?.billingAddress || <span className="text-slate-400">Not provided</span>}
              </p>
            </div>

            {!details?.gstin && !details?.billingAddress && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-sm text-amber-700">
                  Add your GSTIN and billing address to receive proper GST invoices.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
