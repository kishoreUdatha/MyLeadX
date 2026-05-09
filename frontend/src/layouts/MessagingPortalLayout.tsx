import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/messaging-portal/dashboard', icon: HomeIcon },
  { name: 'Contacts', href: '/messaging-portal/contacts', icon: UsersIcon },
  { name: 'Groups', href: '/messaging-portal/groups', icon: FolderIcon },
  { name: 'Campaigns', href: '/messaging-portal/campaigns', icon: MegaphoneIcon },
  { name: 'Templates', href: '/messaging-portal/templates', icon: DocumentTextIcon },
  { name: 'Reports', href: '/messaging-portal/reports', icon: ChartBarIcon },
  { name: 'Billing', href: '/messaging-portal/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/messaging-portal/settings', icon: Cog6ToothIcon },
];

const MessagingPortalLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/messaging-portal/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <div className="flex items-center">
                <span className="text-xl font-bold text-primary-600">Messaging Portal</span>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-600"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="border-t p-4">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <span className="text-xl font-bold text-primary-600">Messaging Portal</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center mb-4">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 lg:hidden">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-center">
            <span className="text-lg font-bold text-primary-600">Messaging Portal</span>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MessagingPortalLayout;
