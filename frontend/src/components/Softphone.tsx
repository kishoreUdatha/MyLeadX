/**
 * Softphone Component
 * Browser-based calling widget for telecallers
 *
 * Features:
 * - One-click calling from browser
 * - Real-time call status
 * - Customer speech display
 * - Call duration timer
 */

import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Headphones,
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Save,
  Settings,
} from 'lucide-react';
import { useSoftphone, SoftphoneStatus, CustomerSpeech } from '../hooks/useSoftphone';
import api from '../services/api';

interface SoftphoneProps {
  // Contact to call
  phoneNumber?: string;
  contactName?: string;
  leadId?: string;
  campaignId?: string;
  contactId?: string;

  // Telecaller's phone (for Conference Bridge mode)
  // If provided, system will call this number and connect to same conference
  defaultTelecallerPhone?: string;

  // Callbacks
  onCallStart?: (callId: string) => void;
  onCallEnd?: (callId: string, duration?: number) => void;
  onError?: (error: string) => void;
  onClose?: () => void; // Close widget without making a call

  // Display options
  showAsWidget?: boolean; // Float in corner vs inline
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoRegister?: boolean;
  minimizable?: boolean;
  showTelecallerPhoneInput?: boolean; // Show input for telecaller's phone

  // Styling
  className?: string;
}

const statusLabels: Record<SoftphoneStatus, string> = {
  idle: 'Initializing...',
  registering: 'Connecting...',
  ready: 'Ready to Call',
  initiating: 'Initiating Call...',
  ringing: 'Ringing...',
  connected: 'Connected',
  ended: 'Call Ended',
  failed: 'Call Failed',
  error: 'Error',
};

const statusColors: Record<SoftphoneStatus, string> = {
  idle: 'bg-gray-400',
  registering: 'bg-yellow-400 animate-pulse',
  ready: 'bg-green-500',
  initiating: 'bg-blue-400 animate-pulse',
  ringing: 'bg-blue-500 animate-pulse',
  connected: 'bg-green-500',
  ended: 'bg-gray-400',
  failed: 'bg-red-500',
  error: 'bg-red-500',
};

export function Softphone({
  phoneNumber,
  contactName,
  leadId,
  campaignId,
  contactId,
  defaultTelecallerPhone = '',
  onCallStart,
  onCallEnd,
  onError,
  onClose,
  showAsWidget = false,
  position = 'bottom-right',
  autoRegister = true,
  minimizable = true,
  showTelecallerPhoneInput = true,
  className = '',
}: SoftphoneProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');
  const [telecallerPhone, setTelecallerPhone] = useState(defaultTelecallerPhone);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [useConferenceBridge, setUseConferenceBridge] = useState(!!defaultTelecallerPhone);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const durationIntervalRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Fetch saved auto-dial number on mount
  useEffect(() => {
    const fetchAutoDialNumber = async () => {
      try {
        const response = await api.get('/softphone/auto-dial-number');
        if (response.data.success && response.data.data.autoDialNumber) {
          const phone = response.data.data.autoDialNumber;
          setSavedPhone(phone);
          setTelecallerPhone(phone);
          setUseConferenceBridge(true); // Auto-enable if phone is saved
        }
      } catch (error) {
        console.log('[Softphone] No saved auto-dial number');
      }
    };
    fetchAutoDialNumber();
  }, []);

  // Save auto-dial number
  const handleSavePhone = async () => {
    if (!telecallerPhone) return;

    setIsSavingPhone(true);
    try {
      const response = await api.post('/softphone/auto-dial-number', {
        phoneNumber: telecallerPhone,
      });
      if (response.data.success) {
        setSavedPhone(response.data.data.autoDialNumber);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('[Softphone] Failed to save phone:', error);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const {
    isRegistered,
    status,
    currentCall,
    customerSpeech,
    error,
    isOnCall,
    canCall,
    initiateCall,
    endCall,
    clearError,
    getCallDuration,
  } = useSoftphone({
    autoRegister,
    onCallStart,
    onCallEnd,
    onError,
  });

  // Update call duration timer
  useEffect(() => {
    if (status === 'connected' && currentCall?.connectedAt) {
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration(getCallDuration());
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration('00:00');
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status, currentCall?.connectedAt, getCallDuration]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [customerSpeech]);

  const handleCall = async () => {
    if (!phoneNumber) {
      onError?.('No phone number provided');
      return;
    }

    if (useConferenceBridge && !telecallerPhone) {
      onError?.('Please enter your phone number for Conference Bridge mode');
      return;
    }

    await initiateCall({
      phoneNumber,
      contactName,
      leadId,
      campaignId,
      contactId,
      telecallerPhone: useConferenceBridge ? telecallerPhone : undefined,
    });
  };

  const handleEndCall = async () => {
    await endCall();
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Widget container classes
  const containerClasses = showAsWidget
    ? `fixed ${positionClasses[position]} z-50 ${isMinimized ? 'w-14 h-14' : 'w-80'}`
    : '';

  // Minimized widget button
  if (showAsWidget && isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`${containerClasses} flex items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${className}`}
        style={{ backgroundColor: isOnCall ? '#22c55e' : '#6366f1' }}
        title={isOnCall ? `On call: ${callDuration}` : 'Open Softphone'}
      >
        {isOnCall ? (
          <PhoneCall className="w-6 h-6 text-white animate-pulse" />
        ) : (
          <Headphones className="w-6 h-6 text-white" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`${containerClasses} bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          <span className="font-medium">Softphone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          <span className="text-xs opacity-90">{statusLabels[status]}</span>
          {minimizable && showAsWidget && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-white/20 rounded transition"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          {onClose && !isOnCall && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button onClick={clearError} className="p-1 hover:bg-red-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Contact Info */}
      {(phoneNumber || currentCall) && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <p className="font-medium text-gray-900">
            {currentCall?.contactName || contactName || 'Unknown Contact'}
          </p>
          <p className="text-sm text-gray-600">
            {currentCall?.phoneNumber || phoneNumber}
          </p>
        </div>
      )}

      {/* Call Status / Active Call */}
      {isOnCall && (
        <div className="px-4 py-4">
          {/* Duration */}
          <div className="text-center mb-4">
            <p className="text-3xl font-mono font-bold text-gray-900">{callDuration}</p>
            <p className="text-sm text-gray-500 mt-1">
              {status === 'ringing' ? 'Ringing customer...' : 'Call in progress'}
            </p>
          </div>

          {/* Customer Speech */}
          {customerSpeech.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Customer Speech
              </p>
              <div className="space-y-2">
                {customerSpeech.map((speech, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    "{speech.text}"
                  </p>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        </div>
      )}

      {/* Ready State - Call Button */}
      {!isOnCall && (
        <div className="px-4 py-4">
          {!isRegistered ? (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin mb-2" />
              <p className="text-sm text-gray-500">Connecting to softphone...</p>
            </div>
          ) : canCall ? (
            <>
              {/* Auto-Dial Status */}
              {savedPhone && !showSettings && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Auto-Dial Enabled</p>
                      <p className="text-xs text-green-600">Your phone: {savedPhone}</p>
                    </div>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-1.5 hover:bg-green-100 rounded transition"
                      title="Change phone number"
                    >
                      <Settings className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-Dial Setup */}
              {(!savedPhone || showSettings) && showTelecallerPhoneInput && (
                <div className="mb-4 space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      {savedPhone ? 'Update Auto-Dial Number' : 'Setup Auto-Dial'}
                    </span>
                  </div>

                  <p className="text-xs text-amber-700">
                    Enter your phone number. When you make calls, your phone will ring automatically and connect you to the customer.
                  </p>

                  {/* Phone Input */}
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={telecallerPhone}
                      onChange={(e) => setTelecallerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={!telecallerPhone || isSavingPhone}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-1 transition text-sm"
                    >
                      {isSavingPhone ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>

                  {showSettings && savedPhone && (
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Legacy Conference Bridge Toggle - hidden when auto-dial is configured */}
              {!savedPhone && showTelecallerPhoneInput && false && (
                <div className="mb-4 space-y-3">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Conference Bridge</span>
                    <button
                      onClick={() => setUseConferenceBridge(!useConferenceBridge)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useConferenceBridge ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useConferenceBridge ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Telecaller Phone Input */}
                  {useConferenceBridge && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Your Phone Number
                      </label>
                      <input
                        type="tel"
                        value={telecallerPhone}
                        onChange={(e) => setTelecallerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        We'll call this number and connect you to the customer
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Call Button */}
              <button
                onClick={handleCall}
                disabled={!phoneNumber || (useConferenceBridge && !telecallerPhone)}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Phone className="w-5 h-5" />
                {!phoneNumber
                  ? 'No Number'
                  : useConferenceBridge
                  ? 'Call via Conference'
                  : 'Call Now'}
              </button>

              {/* Mode Info */}
              {!useConferenceBridge && showTelecallerPhoneInput && (
                <p className="mt-2 text-xs text-center text-gray-400">
                  Enable Conference Bridge to receive call on your phone
                </p>
              )}
            </>
          ) : status === 'initiating' ? (
            <button
              disabled
              className="w-full py-3 bg-blue-400 text-white font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              {useConferenceBridge ? 'Calling you & customer...' : 'Initiating Call...'}
            </button>
          ) : currentCall?.status === 'ended' ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-gray-500">
                Call ended{' '}
                {currentCall.duration
                  ? `(${Math.floor(currentCall.duration / 60)}:${(currentCall.duration % 60)
                      .toString()
                      .padStart(2, '0')})`
                  : ''}
              </p>
            </div>
          ) : currentCall?.status === 'failed' ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
              <p className="text-sm text-red-600">{currentCall.error || 'Call failed'}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t text-center">
        <p className="text-xs text-gray-400">
          {isRegistered ? (
            <>
              <span className="text-green-500">●</span> Ready •{' '}
              <span className="font-mono">Headset connected</span>
            </>
          ) : (
            'Connecting...'
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact Softphone Call Button
 * A simple button that initiates a call when clicked
 */
export function SoftphoneCallButton({
  phoneNumber,
  contactName,
  leadId,
  campaignId,
  contactId,
  defaultTelecallerPhone,
  onCallStart,
  onCallEnd,
  onError,
  className = '',
  size = 'md',
  variant = 'primary',
}: SoftphoneProps & {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const {
    status,
    isOnCall,
    canCall,
    initiateCall,
    endCall,
  } = useSoftphone({
    autoRegister: true,
    onCallStart,
    onCallEnd,
    onError,
  });

  const handleClick = async () => {
    if (isOnCall) {
      await endCall();
    } else if (phoneNumber) {
      await initiateCall({
        phoneNumber,
        contactName,
        leadId,
        campaignId,
        contactId,
        telecallerPhone: defaultTelecallerPhone,
      });
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    primary: isOnCall
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-green-500 hover:bg-green-600 text-white',
    secondary: isOnCall
      ? 'bg-red-100 hover:bg-red-200 text-red-700'
      : 'bg-green-100 hover:bg-green-200 text-green-700',
    ghost: isOnCall
      ? 'hover:bg-red-100 text-red-600'
      : 'hover:bg-green-100 text-green-600',
  };

  const isLoading = status === 'initiating' || status === 'registering';

  return (
    <button
      onClick={handleClick}
      disabled={!canCall && !isOnCall}
      className={`rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={isOnCall ? 'End Call' : phoneNumber ? 'Call Now' : 'No phone number'}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isOnCall ? (
        <PhoneOff className={iconSizes[size]} />
      ) : status === 'ringing' ? (
        <PhoneCall className={`${iconSizes[size]} animate-pulse`} />
      ) : (
        <Phone className={iconSizes[size]} />
      )}
    </button>
  );
}

export default Softphone;
