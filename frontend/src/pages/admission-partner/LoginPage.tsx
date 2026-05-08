import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const AdmissionPartnerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    organizationSlug: orgSlug || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ name: string; logo?: string; brandName?: string } | null>(null);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('admission_partner_token');
    if (token) {
      navigate('/admission-partner');
    }

    // Fetch org info if slug provided
    if (orgSlug) {
      fetchOrgInfo();
    }
  }, [orgSlug, navigate]);

  const fetchOrgInfo = async () => {
    try {
      const response = await fetch(`/api/branding/${orgSlug}`);
      if (response.ok) {
        const data = await response.json();
        setOrgInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch org info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/partner-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store auth data
      localStorage.setItem('admission_partner_token', data.data.token);
      localStorage.setItem('admission_partner', JSON.stringify(data.data.partner));
      if (data.data.wallet) {
        localStorage.setItem('admission_partner_wallet', JSON.stringify(data.data.wallet));
      }

      toast.success('Login successful');
      navigate('/admission-partner');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          {orgInfo?.logo ? (
            <img src={orgInfo.logo} alt={orgInfo.name} className="h-12 mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-primary-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">AP</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {orgInfo?.brandName || orgInfo?.name || 'Admission Partner Portal'}
          </h1>
          <p className="text-gray-600 mt-2">Sign in to manage your applications</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!orgSlug && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Code
                </label>
                <input
                  type="text"
                  value={formData.organizationSlug}
                  onChange={(e) => setFormData({ ...formData, organizationSlug: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter organization code"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="partner@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact your organization admin
        </p>
      </div>
    </div>
  );
};

export default AdmissionPartnerLoginPage;
