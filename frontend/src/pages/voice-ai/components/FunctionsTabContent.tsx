import React from 'react';
import { Calendar, Phone, MessageSquare, Database, Webhook, PhoneOff, Settings } from 'lucide-react';
import type { AgentFunction } from '../types/voiceAgent.types';

interface FunctionsTabContentProps {
  functions: AgentFunction[];
  onToggleFunction: (functionId: string) => void;
  onConfigureFunction: (functionId: string) => void;
}

const functionIcons: Record<string, React.ElementType> = {
  book_appointment: Calendar,
  transfer_call: Phone,
  send_sms: MessageSquare,
  lookup_crm: Database,
  custom_webhook: Webhook,
  end_call: PhoneOff,
};

export const FunctionsTabContent: React.FC<FunctionsTabContentProps> = ({
  functions,
  onToggleFunction,
  onConfigureFunction,
}) => {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Functions</h3>
        <p className="text-sm text-gray-500">
          Enable capabilities that your AI agent can perform during calls.
        </p>
      </div>

      <div className="grid gap-4">
        {functions.map((func) => {
          const Icon = functionIcons[func.type] || Settings;

          return (
            <div
              key={func.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                func.enabled
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      func.enabled
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{func.name}</h4>
                    <p className="text-sm text-gray-500">{func.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {func.enabled && (
                    <button
                      onClick={() => onConfigureFunction(func.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={func.enabled}
                      onChange={() => onToggleFunction(func.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>

              {/* Function-specific configs could go here */}
              {func.enabled && func.type === 'transfer_call' && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer Trigger
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>User requests human</option>
                        <option>Complex query detected</option>
                        <option>Frustrated user</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {func.enabled && func.type === 'send_sms' && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMS Template
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Thank you for your interest! We'll contact you shortly."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Function */}
      <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors">
        + Add Custom Webhook Function
      </button>
    </div>
  );
};
