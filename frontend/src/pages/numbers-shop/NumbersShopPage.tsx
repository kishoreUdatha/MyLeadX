/**
 * Numbers Shop Page
 * Phone number management - Buy and manage phone numbers
 */

import { useState, useEffect } from 'react';
import {
  PhoneIcon,
  WalletIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  ShoppingCartIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useNumbersShop } from './hooks';
import { AddFundsModal } from './components';
import numbersShopService from '../../services/numbers-shop.service';
import toast from 'react-hot-toast';

export default function NumbersShopPage() {
  const {
    activeTab,
    setActiveTab,
    loading,
    wallet,
    transactions,
    showAddFundsModal,
    setShowAddFundsModal,
    handleAddFunds,
    myNumbers,
    handleReleaseNumber,
    refreshData,
  } = useNumbersShop();

  // Marketplace state
  const [marketplaceActive, setMarketplaceActive] = useState<boolean>(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [purchasedNumbers, setPurchasedNumbers] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [selectedType, setSelectedType] = useState<'local' | 'mobile' | 'tollfree'>('local');
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);

  // Load marketplace data
  const loadMarketplaceData = async () => {
    setMarketplaceLoading(true);
    try {
      const [accountRes, numbersRes, ownedRes] = await Promise.all([
        numbersShopService.getPlivoAccountInfo(),
        numbersShopService.listAvailablePlivoNumbers({ country: selectedCountry, type: selectedType, limit: 20 }),
        numbersShopService.getOwnedPlivoNumbers(),
      ]);
      setMarketplaceActive(accountRes?.configured || false);
      setAvailableNumbers(numbersRes.numbers || []);
      setPurchasedNumbers(ownedRes || []);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  // Load marketplace data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'plivo') {
      loadMarketplaceData();
    }
  }, [activeTab, selectedCountry, selectedType]);

  // Purchase number from marketplace
  const handlePurchaseNumber = async (phoneNumber: string) => {
    setPurchasingNumber(phoneNumber);
    try {
      await numbersShopService.purchasePlivoNumber({ phoneNumber });
      toast.success(`Number ${phoneNumber} purchased successfully!`);
      loadMarketplaceData();
      refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to purchase number');
    } finally {
      setPurchasingNumber(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Phone Numbers</h1>
              <p className="text-sm text-slate-500">Buy and manage phone numbers for your business</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Wallet Balance */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <WalletIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Balance:</span>
                <span className="text-sm font-semibold text-slate-900">${wallet?.balance.toFixed(2) || '0.00'}</span>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="ml-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {[
              { id: 'my-numbers', label: 'My Numbers', count: myNumbers.length },
              { id: 'plivo', label: 'Buy Numbers', icon: GlobeAltIcon },
              { id: 'wallet', label: 'Billing & Wallet' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id || (activeTab === 'shop' && tab.id === 'my-numbers')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* My Numbers Tab */}
        {(activeTab === 'my-numbers' || activeTab === 'shop') && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search numbers..."
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Numbers List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : myNumbers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PhoneIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No phone numbers yet</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                    Purchase phone numbers from the marketplace to get started with your AI agents
                  </p>
                  <button
                    onClick={() => setActiveTab('plivo')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition mx-auto"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    Browse Numbers
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Phone Number
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Label
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Assigned To
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myNumbers.map((num) => (
                      <tr key={num.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                              <PhoneIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {num.displayNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{num.friendlyName || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            num.status === 'ASSIGNED' ? 'bg-green-100 text-green-700' :
                            num.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {num.status === 'ASSIGNED' ? 'In Use' : num.status === 'AVAILABLE' ? 'Available' : num.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {num.assignedAgent ? (
                            <span className="text-sm text-slate-900">{num.assignedAgent.name}</span>
                          ) : (
                            <span className="text-sm text-slate-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReleaseNumber(num.id)}
                              disabled={num.status === 'ASSIGNED'}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {/* Buy Numbers Tab */}
        {activeTab === 'plivo' && (
          <div className="space-y-4">
            {/* Owned Numbers */}
            {purchasedNumbers.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-green-800">Your Purchased Numbers ({purchasedNumbers.length})</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-700">Click sync to import these numbers to your database for assignment</p>
                    <button
                      onClick={async () => {
                        try {
                          const result = await numbersShopService.syncPlivoNumbers();
                          toast.success(`Synced ${result.synced} numbers to database`);
                          refreshData();
                          loadMarketplaceData();
                        } catch (e: any) {
                          toast.error(e.response?.data?.message || 'Failed to sync');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      Sync All to Database
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {purchasedNumbers.map((num: any) => (
                    <div key={num.number} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                          <PhoneIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium text-slate-900">+{num.number}</p>
                          <p className="text-xs text-slate-500">{num.region}, {num.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${num.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {num.active ? 'Active' : num.compliance_status || 'Pending'}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">${num.monthly_rental_rate}/mo</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="local">Local</option>
                <option value="mobile">Mobile</option>
                <option value="tollfree">Toll-Free</option>
              </select>
            </div>

            {/* Available Numbers */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-medium text-slate-900">Available Numbers</h3>
                <p className="text-sm text-slate-500">Browse and purchase phone numbers for your business</p>
              </div>

              {marketplaceLoading ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : !marketplaceActive ? (
                <div className="text-center py-12 px-6">
                  <GlobeAltIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Marketplace Not Available</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    The number marketplace is currently not configured. Please contact support to enable this feature.
                  </p>
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No numbers available for this selection</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {availableNumbers.map((num: any) => (
                    <div key={num.phoneNumber} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <PhoneIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium text-slate-900">{num.displayNumber || `+${num.phoneNumber}`}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">{num.region || num.city}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500 capitalize">{num.type}</span>
                            {num.capabilities?.voice && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-green-600">Voice</span>
                              </>
                            )}
                            {num.capabilities?.sms && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-blue-600">SMS</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">${num.monthlyPrice?.toFixed(2) || '3.13'}/mo</p>
                          {num.voiceRate && (
                            <p className="text-xs text-slate-500">${num.voiceRate}/min</p>
                          )}
                        </div>
                        <button
                          onClick={() => handlePurchaseNumber(num.phoneNumber)}
                          disabled={purchasingNumber === num.phoneNumber}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:bg-blue-400"
                        >
                          {purchasingNumber === num.phoneNumber ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCartIcon className="w-4 h-4" />
                          )}
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help Card */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GlobeAltIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">About Phone Numbers</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Numbers are purchased from your account balance</li>
                    <li>• India numbers may require compliance verification</li>
                    <li>• Voice calls are charged per minute based on your plan</li>
                    <li>• Monthly rental is auto-charged from your balance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Wallet Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${wallet?.balance.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="mt-4 w-full text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 py-2 rounded-lg transition"
                >
                  + Add Funds
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active Numbers</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{myNumbers.length + purchasedNumbers.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Phone numbers available for your AI agents
                </p>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-medium text-slate-900">Transaction History</h3>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                          tx.type === 'CREDIT' ? 'bg-green-100 text-green-600' :
                          tx.type === 'REFUND' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {tx.type === 'CREDIT' ? '+' : '−'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">Bal: ${tx.balanceAfter.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {showAddFundsModal && (
        <AddFundsModal
          onAddFunds={handleAddFunds}
          onClose={() => setShowAddFundsModal(false)}
        />
      )}
    </div>
  );
}
