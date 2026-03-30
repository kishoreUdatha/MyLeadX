/**
 * Step 5: Complete Your Agent
 */

import { ArrowLeft, Loader2 } from 'lucide-react';
import { AgentFormData } from '../types';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onBack: () => void;
  onCreate: () => void;
  isCreating: boolean;
}

export function StepComplete({ formData, onUpdate, onBack, onCreate, isCreating }: Props) {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete your agent</h1>
      <p className="text-gray-600 mb-8">
        Name your agent, describe its goal, and optionally add your website
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
