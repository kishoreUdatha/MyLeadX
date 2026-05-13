import { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  BellIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { messagingCreditsApi, MessageBalance, MessagePurchase, MessagePricing } from '../../services/messaging.service';
import api from '../../services/api';

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type Channel = 'sms' | 'whatsapp' | 'rcs';

// Credit packages with discounts (8 packages = 2 rows)
const CREDIT_PACKAGES = [
  { value: 500, label: '500', discount: 0 },
  { value: 1000, label: '1K', discount: 0 },
  { value: 5000, label: '5K', discount: 5 },
  { value: 10000, label: '10K', discount: 8 },
  { value: 50000, label: '50K', discount: 12 },
  { value: 100000, label: '1 Lakh', discount: 15 },
  { value: 500000, label: '5 Lakh', discount: 22 },
  { value: 1000000, label: '10 Lakh', discount: 25 },
];

interface CreditAlertSettings {
  enabled: boolean;
  smsThreshold: number;
  whatsappThreshold: number;
  rcsThreshold: number;
  emailRecipients: string[];
}

interface CreditAlertStatus {
  enabled: boolean;
  channels: {
    sms: { balance: number; threshold: number; isBelowThreshold: boolean };
    whatsapp: { balance: number; threshold: number; isBelowThreshold: boolean };
    rcs: { balance: number; threshold: number; isBelowThreshold: boolean };
  };
  lastAlertSentAt: string | null;
}

const BillingPage = () => {
  const [balance, setBalance] = useState<MessageBalance | null>(null);
  const [pricing, setPricing] = useState<MessagePricing | null>(null);
  const [purchases, setPurchases] = useState<MessagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('sms');
  const [selectedQuantity, setSelectedQuantity] = useState(1000);
  const [purchasing, setPurchasing] = useState(false);

  // Credit Alert states
  const [alertSettings, setAlertSettings] = useState<CreditAlertSettings>({
    enabled: false,
    smsThreshold: 100,
    whatsappThreshold: 100,
    rcsThreshold: 100,
    emailRecipients: [],
  });
  const [alertStatus, setAlertStatus] = useState<CreditAlertStatus | null>(null);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadData();
    loadCreditAlerts();
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, pricingData, purchasesData] = await Promise.all([
        messagingCreditsApi.getBalance(),
        messagingCreditsApi.getPricing(),
        messagingCreditsApi.getPurchaseHistory(),
      ]);
      setBalance(balanceData);
      setPricing(pricingData);
      setPurchases(purchasesData.purchases);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditAlerts = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        api.get('/messaging-portal/settings/credit-alerts'),
        api.get('/messaging-portal/settings/credit-alerts/status'),
      ]);
      setAlertSettings(settingsRes.data);
      setAlertStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to load credit alerts:', error);
    }
  };

  const handleSaveAlertSettings = async () => {
    setSavingAlerts(true);
    try {
      await api.put('/messaging-portal/settings/credit-alerts', alertSettings);
      await loadCreditAlerts();
      alert('Credit alert settings saved successfully!');
    } catch (error) {
      console.error('Failed to save alert settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    try {
      await api.post('/messaging-portal/settings/credit-alerts/test');
      alert('Test alert sent successfully! Check your email.');
    } catch (error) {
      console.error('Failed to send test alert:', error);
      alert('Failed to send test alert. Please check your email configuration.');
    } finally {
      setTestingAlert(false);
    }
  };

  const addEmailRecipient = () => {
    if (newEmail && !alertSettings.emailRecipients.includes(newEmail)) {
      setAlertSettings({
        ...alertSettings,
        emailRecipients: [...alertSettings.emailRecipients, newEmail],
      });
      setNewEmail('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    setAlertSettings({
      ...alertSettings,
      emailRecipients: alertSettings.emailRecipients.filter((e) => e !== email),
    });
  };

  const getChannelPrice = (channel: Channel) => {
    if (!pricing) return 0;
    switch (channel) {
      case 'sms':
        return pricing.smsPrice;
      case 'whatsapp':
        return pricing.whatsappPrice;
      case 'rcs':
        return pricing.rcsPrice;
      default:
        return 0;
    }
  };

  const getDiscount = (quantity: number) => {
    const pkg = CREDIT_PACKAGES.find(p => p.value === quantity);
    return pkg?.discount || 0;
  };

  const calculateSubtotal = () => {
    return selectedQuantity * getChannelPrice(selectedChannel);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    const discount = getDiscount(selectedQuantity);
    return (subtotal * discount) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    return (subtotal - discountAmount).toFixed(2);
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const order = await messagingCreditsApi.createPurchaseOrder({
        channel: selectedChannel,
        quantity: selectedQuantity,
      });

      // Check if test mode (payment gateway not configured)
      if (order.testMode) {
        alert(`Credits added successfully!\n\n${selectedQuantity.toLocaleString()} ${selectedChannel.toUpperCase()} credits have been added to your account.`);
        setShowPurchaseModal(false);
        loadData();
        return;
      }

      // Initialize Razorpay for production
      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Messaging Credits',
        description: `${selectedQuantity} ${selectedChannel.toUpperCase()} Credits`,
        order_id: order.razorpayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await messagingCreditsApi.confirmPurchase({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setShowPurchaseModal(false);
            loadData();
          } catch (error) {
            console.error('Failed to confirm purchase:', error);
          }
        },
        prefill: {
          email: order.email,
          contact: order.phone,
        },
        theme: {
          color: '#4F46E5',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const downloadInvoice = (purchase: MessagePurchase) => {
    // Generate invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${purchase.id.slice(0, 8)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { color: #4F46E5; margin: 0; }
          .header p { color: #666; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .invoice-info div { }
          .invoice-info label { color: #666; font-size: 12px; display: block; }
          .invoice-info span { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f9fafb; }
          .total { text-align: right; font-size: 18px; }
          .total span { font-weight: bold; color: #4F46E5; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>Messaging Credits Purchase</p>
        </div>
        <div class="invoice-info">
          <div>
            <label>Invoice No.</label>
            <span>INV-${purchase.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div>
            <label>Date</label>
            <span>${new Date(purchase.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <label>Status</label>
            <span style="color: green;">PAID</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${purchase.channel} Message Credits</td>
              <td>${purchase.quantity.toLocaleString()}</td>
              <td>₹${purchase.pricePerUnit}</td>
              <td>₹${purchase.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">
          Total: <span>₹${purchase.totalAmount.toLocaleString()}</span>
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>This is a computer-generated invoice.</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${purchase.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />;
      case 'whatsapp':
        return <WhatsAppIcon className="h-5 w-5 text-green-600" />;
      case 'rcs':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <CreditCardIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600">Manage your message credits and view transaction history</p>
      </div>

      {/* Current Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">SMS Credits</p>
                <p className="text-2xl font-bold text-gray-900">{balance?.smsCredits.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSelectedChannel('sms'); setShowPurchaseModal(true); }}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Buy Credits
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <WhatsAppIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">WhatsApp Credits</p>
                <p className="text-2xl font-bold text-gray-900">{balance?.whatsappCredits.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSelectedChannel('whatsapp'); setShowPurchaseModal(true); }}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Buy Credits
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DevicePhoneMobileIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">RCS Credits</p>
                <p className="text-2xl font-bold text-gray-900">{balance?.rcsCredits.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSelectedChannel('rcs'); setShowPurchaseModal(true); }}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Buy Credits
          </button>
        </div>
      </div>

      {/* Pricing Info */}
      {pricing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Pricing</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-sm text-gray-500">SMS</p>
              <p className="text-xl font-bold text-gray-900">₹{pricing.smsPrice}</p>
              <p className="text-xs text-gray-400">per message</p>
            </div>
            <div className="text-center">
              <WhatsAppIcon className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="text-xl font-bold text-gray-900">₹{pricing.whatsappPrice}</p>
              <p className="text-xs text-gray-400">per message</p>
            </div>
            <div className="text-center">
              <DevicePhoneMobileIcon className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-sm text-gray-500">RCS</p>
              <p className="text-xl font-bold text-gray-900">₹{pricing.rcsPrice}</p>
              <p className="text-xs text-gray-400">per message</p>
            </div>
          </div>
        </div>
      )}

      {/* Credit Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BellIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Low Credit Alerts</h2>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={alertSettings.enabled}
              onChange={(e) => setAlertSettings({ ...alertSettings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            <span className="ml-2 text-sm font-medium text-gray-700">
              {alertSettings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {alertSettings.enabled && (
          <div className="space-y-6">
            {/* Current Status */}
            {alertStatus && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg ${alertStatus.channels.sms.isBelowThreshold ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">SMS</span>
                      {alertStatus.channels.sms.isBelowThreshold ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className={`text-lg font-semibold ${alertStatus.channels.sms.isBelowThreshold ? 'text-red-700' : 'text-green-700'}`}>
                      {alertStatus.channels.sms.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Threshold: {alertStatus.channels.sms.threshold.toLocaleString()}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${alertStatus.channels.whatsapp.isBelowThreshold ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">WhatsApp</span>
                      {alertStatus.channels.whatsapp.isBelowThreshold ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className={`text-lg font-semibold ${alertStatus.channels.whatsapp.isBelowThreshold ? 'text-red-700' : 'text-green-700'}`}>
                      {alertStatus.channels.whatsapp.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Threshold: {alertStatus.channels.whatsapp.threshold.toLocaleString()}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${alertStatus.channels.rcs.isBelowThreshold ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">RCS</span>
                      {alertStatus.channels.rcs.isBelowThreshold ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className={`text-lg font-semibold ${alertStatus.channels.rcs.isBelowThreshold ? 'text-red-700' : 'text-green-700'}`}>
                      {alertStatus.channels.rcs.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Threshold: {alertStatus.channels.rcs.threshold.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Threshold Settings */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Alert Thresholds</h3>
              <p className="text-xs text-gray-500 mb-4">You'll receive an alert when credits fall below these values</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMS Threshold</label>
                  <input
                    type="number"
                    value={alertSettings.smsThreshold}
                    onChange={(e) => setAlertSettings({ ...alertSettings, smsThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Threshold</label>
                  <input
                    type="number"
                    value={alertSettings.whatsappThreshold}
                    onChange={(e) => setAlertSettings({ ...alertSettings, whatsappThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RCS Threshold</label>
                  <input
                    type="number"
                    value={alertSettings.rcsThreshold}
                    onChange={(e) => setAlertSettings({ ...alertSettings, rcsThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Email Recipients */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Email Recipients</h3>
              <p className="text-xs text-gray-500 mb-4">Alert emails will be sent to these addresses</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                />
                <button
                  onClick={addEmailRecipient}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
              {alertSettings.emailRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {alertSettings.emailRecipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmailRecipient(email)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No email recipients added</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveAlertSettings}
                disabled={savingAlerts}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {savingAlerts ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={handleTestAlert}
                disabled={testingAlert || alertSettings.emailRecipients.length === 0}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                <BellAlertIcon className="h-4 w-4 mr-2" />
                {testingAlert ? 'Sending...' : 'Send Test Alert'}
              </button>
            </div>
          </div>
        )}

        {!alertSettings.enabled && (
          <p className="text-sm text-gray-500">
            Enable low credit alerts to receive email notifications when your message credits fall below a specified threshold.
          </p>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchases.length > 0 ? (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getChannelIcon(purchase.channel)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {purchase.channel}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{purchase.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(purchase.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {purchase.status === 'COMPLETED' && (
                      <button
                        onClick={() => downloadInvoice(purchase)}
                        className="text-primary-600 hover:text-primary-700"
                        title="Download Invoice"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="mt-4 text-primary-600 hover:text-primary-700"
                  >
                    Make your first purchase
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowPurchaseModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Credits</h3>
                <button onClick={() => setShowPurchaseModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Channel Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Channel</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedChannel('sms')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedChannel === 'sms'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ChatBubbleLeftRightIcon className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                      <p className="text-xs font-medium">SMS</p>
                      <p className="text-xs text-gray-500">₹{pricing?.smsPrice}/msg</p>
                    </button>
                    <button
                      onClick={() => setSelectedChannel('whatsapp')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedChannel === 'whatsapp'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <WhatsAppIcon className="h-6 w-6 mx-auto text-green-600 mb-1" />
                      <p className="text-xs font-medium">WhatsApp</p>
                      <p className="text-xs text-gray-500">₹{pricing?.whatsappPrice}/msg</p>
                    </button>
                    <button
                      onClick={() => setSelectedChannel('rcs')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedChannel === 'rcs'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <DevicePhoneMobileIcon className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                      <p className="text-xs font-medium">RCS</p>
                      <p className="text-xs text-gray-500">₹{pricing?.rcsPrice}/msg</p>
                    </button>
                  </div>
                </div>

                {/* Quantity Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Package</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CREDIT_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.value}
                        onClick={() => setSelectedQuantity(pkg.value)}
                        className={`py-2.5 px-2 rounded-lg border-2 text-center transition-all ${
                          selectedQuantity === pkg.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-800">{pkg.label}</p>
                        {pkg.discount > 0 && (
                          <p className="text-[10px] text-green-600 font-semibold">{pkg.discount}% OFF</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Credits</span>
                    <span className="text-sm font-medium">{selectedQuantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Price per credit</span>
                    <span className="text-sm font-medium">₹{getChannelPrice(selectedChannel)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-medium">₹{calculateSubtotal().toLocaleString()}</span>
                  </div>
                  {getDiscount(selectedQuantity) > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-green-600 font-medium">
                        Bulk Discount ({getDiscount(selectedQuantity)}%)
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        -₹{calculateDiscountAmount().toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <div className="text-right">
                        {getDiscount(selectedQuantity) > 0 && (
                          <span className="text-sm text-gray-400 line-through mr-2">
                            ₹{calculateSubtotal().toLocaleString()}
                          </span>
                        )}
                        <span className="text-base font-bold text-primary-600">₹{calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {purchasing ? (
                    'Processing...'
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Pay ₹{calculateTotal()}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
