import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, BriefcaseIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AgentType {
  id: string;
  name: string;
  icon: React.ReactNode;
  badge?: string;
  conversation: {
    user: string;
    responses: string[];
  };
}

const agentTypes: AgentType[] = [
  {
    id: 'personal-assistant',
    name: 'Personal Assistant',
    icon: <UserIcon className="w-5 h-5" />,
    conversation: {
      user: 'Could you see whether I have any urgent outstanding emails?',
      responses: [
        'Sure, let me check.',
        "You've got one urgent email from your manager about tomorrow's meeting. Want a quick summary?",
      ],
    },
  },
  {
    id: 'business-agent',
    name: 'Business Agent',
    icon: <BriefcaseIcon className="w-5 h-5" />,
    badge: 'Improved',
    conversation: {
      user: 'Can you tell me more about pricing?',
      responses: [
        'Absolutely! We offer three plans, Starter, Pro, and Enterprise. Want a quick breakdown, or should I help you pick the best fit?',
      ],
    },
  },
  {
    id: 'education-agent',
    name: 'Education Agent',
    icon: <span className="text-lg">🎓</span>,
    conversation: {
      user: 'What courses do you offer for computer science?',
      responses: [
        "We have a comprehensive Computer Science program! We offer Bachelor's and Master's degrees with specializations in AI, Data Science, and Software Engineering.",
      ],
    },
  },
  {
    id: 'healthcare-agent',
    name: 'Healthcare Agent',
    icon: <span className="text-lg">🏥</span>,
    conversation: {
      user: 'I need to book an appointment with Dr. Smith',
      responses: [
        "I'd be happy to help you schedule an appointment with Dr. Smith. Let me check the available slots for this week.",
      ],
    },
  },
];

export const NewAgentSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(agentTypes.length / itemsPerPage);

  const visibleAgents = agentTypes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleSelectBlank = () => {
    // Navigate to blank agent creation
    navigate('/voice-ai/create', { state: { isBlank: true } });
  };

  const handleSelectAgentType = (agentType: AgentType) => {
    // Navigate to agent creation with pre-selected type
    navigate('/voice-ai/create', { state: { agentType: agentType.id } });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">New agent</h1>
          <p className="text-gray-500 text-lg">What type of agent would you like to create?</p>
        </div>

        {/* Blank Agent Option */}
        <button
          onClick={handleSelectBlank}
          className="w-full mb-6 p-6 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all group"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-gray-400">
              <SparklesIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-500" />
            </div>
            <span className="text-base font-medium text-gray-700 group-hover:text-gray-900">
              Blank Agent
            </span>
          </div>
        </button>

        {/* Agent Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {visibleAgents.map((agentType) => (
            <button
              key={agentType.id}
              onClick={() => handleSelectAgentType(agentType)}
              className="p-5 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left group"
            >
              {/* Chat Preview */}
              <div className="space-y-3 mb-5">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-md text-sm max-w-[90%]">
                    {agentType.conversation.user}
                  </div>
                </div>

                {/* Agent Responses */}
                {agentType.conversation.responses.map((response, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm max-w-[90%]">
                      {response}
                    </div>
                    {i === agentType.conversation.responses.length - 1 && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <span className="text-gray-500">{agentType.icon}</span>
                <span className="font-medium text-gray-800">{agentType.name}</span>
                {agentType.badge && (
                  <span className="ml-2 px-2.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                    {agentType.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Pagination Dots */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentPage
                    ? 'bg-gray-900 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAgentSelectionPage;
