/**
 * Step 1: Select Agent Type
 */

import React from 'react';
import { User, Briefcase, Circle } from 'lucide-react';
import { AgentFormData, AgentType } from '../types';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onNext: () => void;
}

interface AgentTypeOption {
  id: AgentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  conversation: {
    user: string;
    agent: string[];
  };
  badge?: string;
}

const AGENT_TYPES: AgentTypeOption[] = [
  {
    id: 'blank',
    title: 'Blank Agent',
    description: 'Start from scratch',
    icon: <Circle className="w-5 h-5" />,
    conversation: {
      user: '',
      agent: [],
    },
  },
  {
    id: 'personal',
    title: 'Personal Assistant',
    description: 'General purpose assistant',
    icon: <User className="w-5 h-5" />,
    conversation: {
      user: 'Could you see whether I have any urgent outstanding emails?',
      agent: [
        'Sure, let me check.',
        "You've got one urgent email from your manager about tomorrow's meeting. Want a quick summary?",
      ],
    },
  },
  {
    id: 'business',
    title: 'Business Agent',
    description: 'Professional business use cases',
    icon: <Briefcase className="w-5 h-5" />,
    badge: 'Improved',
    conversation: {
      user: 'Can you tell me more about pricing?',
      agent: [
        'Absolutely! We offer three plans, Starter, Pro, and Enterprise. Want a quick breakdown, or should I help you pick the best fit?',
      ],
    },
  },
];

export function StepAgentType({ formData, onUpdate, onNext }: Props) {
  const handleSelect = (type: AgentType) => {
    onUpdate({ agentType: type });
    if (type === 'blank') {
      // Skip to step 5 for blank agent
      onUpdate({ industry: '', useCase: '' });
    }
    onNext();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">New agent</h1>
      <p className="text-gray-600 mb-8">What type of agent would you like to create?</p>

      <div className="space-y-4">
        {/* Blank Agent Option */}
        <button
          onClick={() => handleSelect('blank')}
          className={`w-full p-4 border-2 rounded-xl text-center transition-all hover:border-gray-400 ${
            formData.agentType === 'blank'
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <Circle className="w-5 h-5" />
            <span className="font-medium">Blank Agent</span>
          </div>
        </button>

        {/* Personal & Business Agent Options */}
        <div className="grid grid-cols-2 gap-4">
          {AGENT_TYPES.filter(t => t.id !== 'blank').map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`p-6 border-2 rounded-xl text-left transition-all hover:border-gray-400 ${
                formData.agentType === type.id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200'
              }`}
            >
              {/* Conversation Preview */}
              <div className="space-y-3 mb-6">
                {type.conversation.user && (
                  <div className="flex justify-end">
                    <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
                      {type.conversation.user}
                    </div>
                  </div>
                )}
                {type.conversation.agent.map((msg, idx) => (
                  <div key={idx} className="flex justify-start items-end gap-2">
                    {idx === type.conversation.agent.length - 1 && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                    )}
                    <div className={`bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm max-w-[85%] text-sm ${
                      idx < type.conversation.agent.length - 1 ? 'ml-10' : ''
                    }`}>
                      {msg}
                    </div>
                  </div>
                ))}
              </div>

              {/* Label */}
              <div className="flex items-center gap-2">
                {type.icon}
                <span className="font-medium text-gray-900">{type.title}</span>
                {type.badge && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {type.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StepAgentType;
