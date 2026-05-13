/**
 * Message Credits Page
 * Display credit balances and purchase history
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CreditCardIcon,
  ChatBubbleLeftIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { messagingCreditsApi, MessageBalance, MessagePricing, MessagePurchase, MessageChannel } from '../../services/messaging.service';

// Razorpay declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: MessageChannel;
  pricing: MessagePricing;
  onSuccess: () => void;
}

function PurchaseModal({ isOpen, onClose, channel, pricing, onSuccess }: PurchaseModalProps) {
  const [quantity, setQuantity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getChannelPrice = () => {
    switch (channel) {
      case 'SMS': return pricing.smsPrice;
      case 'WHATSAPP': return pricing.whatsappPrice;
      case 'RCS': return pricing.rcsPrice;
    }
  };

  const getBulkDiscount = () => {
    const discounts = channel === 'SMS' ? pricing.smsBulkDiscount :
                      channel === 'WHATSAPP' ? pricing.whatsappBulkDiscount :
                      pricing.rcsBulkDiscount;

    const tiers = Object.keys(discounts).map(Number).sort((a, b) => b - a);
    for (const tier of tiers) {
      if (quantity >= tier) {
        return discounts[tier.toString()];
      }
    }
    return null;
  };

  const calculatePrice = () => {
    const basePrice = getChannelPrice();
    const discountPrice = getBulkDiscount();
    const finalPrice = discountPrice || basePrice;
    return {
      pricePerUnit: finalPrice,
      total: finalPrice * quantity,
      savings: discountPrice ? (basePrice - discountPrice) * quantity : 0,
    };
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await messagingCreditsApi.createPurchaseOrder(channel, quantity);

      if (!result.success || !result.razorpayOrderId) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: (result.amount || 0) * 100,
        currency: result.currency || 'INR',
        name: 'VoiceBridge',
        description: `${quantity} ${channel} Credits`,
        order_id: result.razorpayOrderId,
        handler: async function (response: any) {
          try {
            await messagingCreditsApi.confirmPurchase(
              result.purchaseId!,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            onSuccess();
            onClose();
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          }
        },
        prefill: {},
        theme: { color: '#6366f1' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { pricePerUnit, total, savings } = calculatePrice();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase {channel} Credits</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={100}>100 credits</option>
              <option value={500}>500 credits</option>
              <option value={1000}>1,000 credits</option>
              <option value={5000}>5,000 credits</option>
              <option value={10000}>10,000 credits</option>
            </select>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Price per credit</span>
              <span>₹{pricePerUnit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Quantity</span>
              <span>{quantity.toLocaleString()}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-sm text-green-600 mb-2">
                <span>Savings</span>
                <span>-₹{savings.toFixed(2)}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Pay with Razorpay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  const [balance, setBalance] = useState<MessageBalance | null>(null);
  const [pricing, setPricing] = useState<MessagePricing | null>(null);
  const [purchases, setPurchases] = useState<MessagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<{ open: boolean; channel: MessageChannel }>({
    open: false,
    channel: 'SMS',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [balanceData, pricingData, purchasesData] = await Promise.all([
        messagingCreditsApi.getBalance(),
        messagingCreditsApi.getPricing(),
        messagingCreditsApi.getPurchaseHistory(),
      ]);
      setBalance(balanceData);
      setPricing(pricingData);
      setPurchases(purchasesData.purchases);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPurchaseModal = (channel: MessageChannel) => {
    setPurchaseModal({ open: true, channel });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 bg-slate-200 rounded-lg"></div>
            <div className="h-40 bg-slate-200 rounded-lg"></div>
            <div className="h-40 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={fetchData} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Message Credits</h1>
        <p className="text-slate-600">Purchase and manage your messaging credits</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* SMS Credits */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftIcon className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500 uppercase">SMS</span>
          </div>
          <div className="mb-4">
            <p className="text-3xl font-bold text-slate-900">{balance?.smsCredits.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Available credits</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">₹{pricing?.smsPrice.toFixed(2)}/msg</span>
            <button
              onClick={() => openPurchaseModal('SMS')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Buy Credits
            </button>
          </div>
        </div>

        {/* WhatsApp Credits */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DevicePhoneMobileIcon className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-slate-500 uppercase">WhatsApp</span>
          </div>
          <div className="mb-4">
            <p className="text-3xl font-bold text-slate-900">{balance?.whatsappCredits.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Available credits</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">₹{pricing?.whatsappPrice.toFixed(2)}/msg</span>
            <button
              onClick={() => openPurchaseModal('WHATSAPP')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Buy Credits
            </button>
          </div>
        </div>

        {/* RCS Credits */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-slate-500 uppercase">RCS</span>
          </div>
          <div className="mb-4">
            <p className="text-3xl font-bold text-slate-900">{balance?.rcsCredits.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Available credits</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">₹{pricing?.rcsPrice.toFixed(2)}/msg</span>
            <button
              onClick={() => openPurchaseModal('RCS')}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              Buy Credits
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5" />
          Bulk Discount Pricing
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Quantity</th>
                <th className="text-center py-3 px-4">SMS</th>
                <th className="text-center py-3 px-4">WhatsApp</th>
                <th className="text-center py-3 px-4">RCS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">Up to 999</td>
                <td className="text-center py-3 px-4">₹{pricing?.smsPrice.toFixed(2)}</td>
                <td className="text-center py-3 px-4">₹{pricing?.whatsappPrice.toFixed(2)}</td>
                <td className="text-center py-3 px-4">₹{pricing?.rcsPrice.toFixed(2)}</td>
              </tr>
              {pricing && Object.keys(pricing.smsBulkDiscount).map((qty) => (
                <tr key={qty} className="border-b">
                  <td className="py-3 px-4">{Number(qty).toLocaleString()}+</td>
                  <td className="text-center py-3 px-4 text-green-600">₹{pricing.smsBulkDiscount[qty].toFixed(2)}</td>
                  <td className="text-center py-3 px-4 text-green-600">₹{(pricing.whatsappBulkDiscount[qty] || pricing.whatsappPrice).toFixed(2)}</td>
                  <td className="text-center py-3 px-4 text-green-600">₹{(pricing.rcsBulkDiscount[qty] || pricing.rcsPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="w-5 h-5" />
          Purchase History
        </h2>
        {purchases.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No purchases yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Channel</th>
                  <th className="text-right py-3 px-4">Quantity</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b">
                    <td className="py-3 px-4">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        purchase.channel === 'SMS' ? 'bg-blue-100 text-blue-700' :
                        purchase.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {purchase.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{purchase.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">₹{Number(purchase.totalAmount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        purchase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {pricing && (
        <PurchaseModal
          isOpen={purchaseModal.open}
          onClose={() => setPurchaseModal({ ...purchaseModal, open: false })}
          channel={purchaseModal.channel}
          pricing={pricing}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
