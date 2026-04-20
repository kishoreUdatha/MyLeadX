/**
 * Step 5: Complete Your Agent
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Phone, AlertCircle } from 'lucide-react';
import { AgentFormData, PhoneNumberOption } from '../types';
import api from '../../../../services/api';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onBack: () => void;
  onCreate: () => void;
  isCreating: boolean;
}

export function StepComplete({ formData, onUpdate, onBack, onCreate, isCreating }: Props) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  // Fetch available phone numbers
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {
        setLoadingNumbers(true);
        const response = await api.get('/numbers-shop/my-numbers');
        const numbers = response.data?.numbers || response.data || [];
        // Filter to only show available numbers (not assigned to other agents)
        const availableNumbers = numbers.filter(
          (num: any) => num.status === 'AVAILABLE' || !num.assignedToAgentId
        );
        setPhoneNumbers(availableNumbers);
      } catch (error) {
        console.error('Failed to fetch phone numbers:', error);
        setPhoneNumbers([]);
      } finally {
        setLoadingNumbers(false);
      }
    };

    fetchPhoneNumbers();
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your agent</h1>
      <p className="text-gray-600 mb-8">
        Name your agent, assign a phone number, and describe its goal
      </p>

      <div className="space-y-6">
        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="My_Agent"
              maxLength={50}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {formData.name.length}/50
            </span>
          </div>
        </div>

        {/* Phone Number Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number for Outbound Calls
            </div>
          </label>
          {loadingNumbers ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-gray-500">Loading phone numbers...</span>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="px-4 py-4 border border-amber-200 rounded-lg bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No phone numbers available</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Purchase phone numbers from the{' '}
                    <a href="/numbers-shop" className="underline font-medium">
                      Numbers Shop
                    </a>{' '}
                    to enable outbound calling.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <select
              value={formData.phoneNumberId || ''}
              onChange={(e) => onUpdate({ phoneNumberId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select a phone number (optional)</option>
              {phoneNumbers.map((num) => (
                <option key={num.id} value={num.id}>
                  {num.displayNumber || num.number}
                  {num.friendlyName ? ` - ${num.friendlyName}` : ''}
                  {' '}({num.provider})
                </option>
              ))}
            </select>
          )}
          <p className="text-sm text-gray-500 mt-1">
            This number will be used as the caller ID when the agent makes outbound calls.
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website (Optional)
          </label>
          <input
            type="url"
            value={formData.website || ''}
            onChange={(e) => onUpdate({ website: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            We'll only access publicly available information from your website to personalize your agent.
          </p>
        </div>

        {/* Main Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Main Goal <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.mainGoal}
            onChange={(e) => onUpdate({ mainGoal: e.target.value })}
            placeholder="Describe what your agent should accomplish..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        {/* Chat Only Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdate({ chatOnly: !formData.chatOnly })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              formData.chatOnly ? 'bg-gray-900' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                formData.chatOnly ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div>
            <div className="font-medium text-gray-900">Chat only</div>
            <div className="text-sm text-gray-500">
              Audio will not be processed and only text will be used
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={onBack}
          disabled={isCreating}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={onCreate}
          disabled={!formData.name.trim() || !formData.mainGoal.trim() || isCreating}
          className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Agent
        </button>
      </div>
    </div>
  );
}

export default StepComplete;
