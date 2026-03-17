import React from 'react';
import { Clock, Mic, Brain } from 'lucide-react';
import type { AgentFormData, CallFlowOption } from '../types/voiceAgent.types';

interface SettingsTabContentProps {
  formData: AgentFormData;
  onUpdateFormData: (updates: Partial<AgentFormData>) => void;
  callFlows: CallFlowOption[];
  loadingFlows: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  formData,
  onUpdateFormData,
  callFlows,
  loadingFlows,
}) => {
  const toggleDay = (day: string) => {
    const newDays = formData.workingDays.includes(day)
      ? formData.workingDays.filter(d => d !== day)
      : [...formData.workingDays, day];
    onUpdateFormData({ workingDays: newDays });
  };

  return (
    <div className="space-y-8">
      {/* AI Behavior Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Behavior</h3>
            <p className="text-sm text-gray-500">Configure how the AI responds</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personality
            </label>
            <select
              value={formData.personality}
              onChange={(e) => onUpdateFormData({ personality: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Speed
            </label>
            <select
              value={formData.responseSpeed}
              onChange={(e) => onUpdateFormData({ responseSpeed: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="fast">Fast (Quick responses)</option>
              <option value="normal">Normal</option>
              <option value="thoughtful">Thoughtful (More detailed)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creativity Level: {Math.round(formData.creativity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.creativity}
              onChange={(e) => onUpdateFormData({ creativity: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interrupt Handling
            </label>
            <select
              value={formData.interruptHandling}
              onChange={(e) => onUpdateFormData({ interruptHandling: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="polite">Polite (Acknowledge and continue)</option>
              <option value="wait">Wait (Let user finish)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Call Handling Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Call Handling</h3>
            <p className="text-sm text-gray-500">Working hours and call settings</p>
          </div>
        </div>

        {/* Working Hours Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-medium text-gray-900">Working Hours</div>
            <div className="text-sm text-gray-500">Restrict calls to specific hours</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.workingHoursEnabled}
              onChange={(e) => onUpdateFormData({ workingHoursEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>

        {formData.workingHoursEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Days
              </label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.workingDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) => onUpdateFormData({ workingHoursStart: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) => onUpdateFormData({ workingHoursEnd: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* After Hours Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                After Hours Message
              </label>
              <textarea
                value={formData.afterHoursMessage}
                onChange={(e) => onUpdateFormData({ afterHoursMessage: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="Thank you for calling. Our office is currently closed..."
              />
            </div>
          </div>
        )}

        {/* Other Call Settings */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Call Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.maxCallDuration}
              onChange={(e) => onUpdateFormData({ maxCallDuration: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Silence Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={formData.silenceTimeout}
              onChange={(e) => onUpdateFormData({ silenceTimeout: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Record Calls Toggle */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div>
            <div className="font-medium text-gray-900">Record Calls</div>
            <div className="text-sm text-gray-500">Store recordings for quality assurance</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recordCalls}
              onChange={(e) => onUpdateFormData({ recordCalls: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>
      </div>

      {/* Call Flow Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Mic className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Call Flow</h3>
            <p className="text-sm text-gray-500">Link to a predefined call flow</p>
          </div>
        </div>

        <select
          value={formData.callFlowId}
          onChange={(e) => onUpdateFormData({ callFlowId: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={loadingFlows}
        >
          <option value="">No call flow (use system prompt)</option>
          {callFlows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name} {flow._count?.callLogs ? `(${flow._count.callLogs} calls)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Lead Generation Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Lead Generation</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Auto-create Leads</div>
              <div className="text-sm text-gray-500">Automatically create leads from calls</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoCreateLeads}
                onChange={(e) => onUpdateFormData({ autoCreateLeads: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Deduplicate by Phone</div>
              <div className="text-sm text-gray-500">Prevent duplicate leads with same phone</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.deduplicateByPhone}
                onChange={(e) => onUpdateFormData({ deduplicateByPhone: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
