import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Building, User, Phone, Mail, MapPin,
  Percent, CreditCard, Users, ChevronDown
} from 'lucide-react';
import { admissionPartnerService } from '../../services/admission-partner.service';
import toast from 'react-hot-toast';

interface PartnerForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  partnerType: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT';
  parentPartnerId: string;
  companyName: string;
  city: string;
  state: string;
  address: string;
  panNumber: string;
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  defaultCommissionPercent: number;
}

const initialForm: PartnerForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  partnerType: 'SUPER_PARTNER',
  parentPartnerId: '',
  companyName: '',
  city: '',
  state: '',
  address: '',
  panNumber: '',
  bankAccountNumber: '',
  bankName: '',
  ifscCode: '',
  defaultCommissionPercent: 10,
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

export function AddPartnerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PartnerForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [superPartners, setSuperPartners] = useState<any[]>([]);
  const [subPartners, setSubPartners] = useState<any[]>([]);

  // Fetch parent partners for dropdown
  useEffect(() => {
    const fetchParentPartners = async () => {
      try {
        const response = await admissionPartnerService.listPartners({ type: 'SUPER_PARTNER', status: 'ACTIVE' });
        if (response.success) {
          setSuperPartners(response.data || []);
        }
        const subResponse = await admissionPartnerService.listPartners({ type: 'SUB_PARTNER', status: 'ACTIVE' });
        if (subResponse.success) {
          setSubPartners(subResponse.data || []);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
      }
    };
    fetchParentPartners();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'defaultCommissionPercent' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!form.password.trim() || form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if ((form.partnerType === 'SUB_PARTNER' || form.partnerType === 'AGENT') && !form.parentPartnerId) {
      toast.error('Please select a parent partner');
      return;
    }

    try {
      setLoading(true);
      const response = await admissionPartnerService.createPartner({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        partnerType: form.partnerType,
        parentPartnerId: form.parentPartnerId || undefined,
        companyName: form.companyName || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        address: form.address || undefined,
        panNumber: form.panNumber || undefined,
        defaultCommissionPercent: form.defaultCommissionPercent,
      });

      if (response.success) {
        toast.success('Partner created successfully!');
        navigate('/admission-partners');
      } else {
        toast.error(response.message || 'Failed to create partner');
      }
    } catch (error: any) {
      console.error('Error creating partner:', error);
      toast.error(error.response?.data?.message || 'Failed to create partner');
    } finally {
      setLoading(false);
    }
  };

  const getParentPartnerOptions = () => {
    if (form.partnerType === 'SUB_PARTNER') {
      return superPartners;
    } else if (form.partnerType === 'AGENT') {
      return [...superPartners, ...subPartners];
    }
    return [];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admission-partners')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Partner</h1>
          <p className="text-slate-600">Create a new admission partner, sub-partner, or agent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Partner Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Partner Type
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'SUPER_PARTNER', label: 'Super Partner', desc: 'Top-level partner with sub-partners & agents' },
              { value: 'SUB_PARTNER', label: 'Sub Partner', desc: 'Works under a Super Partner' },
              { value: 'AGENT', label: 'Agent', desc: 'Individual agent under a partner' },
            ].map((type) => (
              <label
                key={type.value}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  form.partnerType === type.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="partnerType"
                  value={type.value}
                  checked={form.partnerType === type.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <p className="font-medium text-slate-900">{type.label}</p>
                <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
              </label>
            ))}
          </div>

          {/* Parent Partner Selection */}
          {(form.partnerType === 'SUB_PARTNER' || form.partnerType === 'AGENT') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Parent Partner <span className="text-red-500">*</span>
              </label>
              <select
                name="parentPartnerId"
                value={form.parentPartnerId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select parent partner...</option>
                {getParentPartnerOptions().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type === 'SUPER_PARTNER' ? 'Super Partner' : 'Sub Partner'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Partner/Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company/Agency Name
              </label>
              <input
                type="text"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="partner@email.com"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters (partner will use this to login)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">Partner will use this password to login to their portal</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <select
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select state...</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter full address"
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Commission & Bank Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            Commission & Bank Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Commission Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  name="defaultCommissionPercent"
                  value={form.defaultCommissionPercent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                name="panNumber"
                value={form.panNumber}
                onChange={handleChange}
                placeholder="ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                placeholder="Enter bank name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                name="bankAccountNumber"
                value={form.bankAccountNumber}
                onChange={handleChange}
                placeholder="Enter account number"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                name="ifscCode"
                value={form.ifscCode}
                onChange={handleChange}
                placeholder="SBIN0001234"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admission-partners')}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Partner
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
