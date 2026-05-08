import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  WalletIcon,
  UserGroupIcon,
  LinkIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  partnerCode: string;
  partnerType: string;
  tier: string;
  companyName?: string;
}

interface WalletInfo {
  balance: number;
  pendingBalance: number;
}

const navigation = [
  { name: 'Dashboard', href: '/admission-partner', icon: HomeIcon },
  { name: 'Applications', href: '/admission-partner/applications', icon: DocumentTextIcon },
  { name: 'Application Links', href: '/admission-partner/links', icon: LinkIcon },
  { name: 'Wallet & Payouts', href: '/admission-partner/wallet', icon: WalletIcon },
  { name: 'My Team', href: '/admission-partner/team', icon: UserGroupIcon },
  { name: 'Settings', href: '/admission-partner/settings', icon: Cog6ToothIcon },
];

const tierColors: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-800',
  BRONZE: 'bg-orange-100 text-orange-800',
  SILVER: 'bg-gray-200 text-gray-800',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

export const AdmissionPartnerLayout: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Check auth and load partner info
    const token = localStorage.getItem('admission_partner_token');
    const partnerData = localStorage.getItem('admission_partner');
    const walletData = localStorage.getItem('admission_partner_wallet');

    if (!token || !partnerData) {
      navigate('/admission-partner/login');
      return;
    }

    setPartner(JSON.parse(partnerData));
    if (walletData) {
      setWallet(JSON.parse(walletData));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admission_partner_token');
    localStorage.removeItem('admission_partner');
    localStorage.removeItem('admission_partner_wallet');
    navigate('/admission-partner/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!partner) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-white">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <span className="text-xl font-bold text-primary-600">Partner Portal</span>
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admission-partner'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-6 border-b">
            <span className="text-xl font-bold text-primary-600">Partner Portal</span>
          </div>

          {/* Partner Info Card */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-4 text-white">
              <p className="text-sm opacity-80">Welcome back,</p>
              <p className="font-semibold truncate">{partner.name}</p>
              <p className="text-xs opacity-70 mt-1">{partner.partnerCode}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[partner.tier]} bg-white/90`}>
                  {partner.tier}
                </span>
                <span className="text-xs opacity-80">{partner.partnerType.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Wallet Summary */}
          {wallet && (
            <div className="px-4 pb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Available Balance</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(wallet.balance)}</p>
                {wallet.pendingBalance > 0 && (
                  <p className="text-xs text-orange-600">
                    +{formatCurrency(wallet.pendingBalance)} pending
                  </p>
                )}
              </div>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admission-partner'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <BellIcon className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {partner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
                      <div className="p-3 border-b">
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="text-sm text-gray-500">{partner.email}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate('/admission-partner/settings');
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Settings
                        </button>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdmissionPartnerLayout;
