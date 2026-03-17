import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Brain, Sparkles, MessageCircle, FileText, Phone, Plus, Loader2 } from 'lucide-react';
import type { CallFlowOption } from '../types/voiceAgent.types';

interface WorkflowTabContentProps {
  callFlowId: string;
  onSelectCallFlow: (flowId: string) => void;
  callFlows: CallFlowOption[];
  loadingFlows: boolean;
}

export const WorkflowTabContent: React.FC<WorkflowTabContentProps> = ({
  callFlowId,
  onSelectCallFlow,
  callFlows,
  loadingFlows,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Grid3X3 className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-800">Conversation Workflow</p>
          <p className="text-xs text-blue-700 mt-1">
            Define a structured call flow for guided conversations. Without a workflow, the agent uses AI prompts for natural conversation.
          </p>
        </div>
      </div>

      {/* Workflow Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Select Call Flow</h3>
          <button
            type="button"
            onClick={() => navigate('/call-flows/builder')}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Flow
          </button>
        </div>

        {/* No Flow Selected Card */}
        <div
          onClick={() => onSelectCallFlow('')}
          className={`border-2 rounded-xl p-5 cursor-pointer transition ${
            !callFlowId
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              !callFlowId ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <Brain size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">AI-Powered Conversation</h4>
                {!callFlowId && (
                  <span className="px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">Active</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Let the AI handle conversations naturally using your system prompt. Best for flexible, dynamic interactions.
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Sparkles size={12} /> Natural language
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} /> Dynamic responses
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Flows */}
        {loadingFlows ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading workflows...</span>
          </div>
        ) : callFlows.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Workflows</h4>
            {callFlows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => onSelectCallFlow(flow.id)}
                className={`border-2 rounded-xl p-5 cursor-pointer transition ${
                  callFlowId === flow.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    callFlowId === flow.id ? 'bg-teal-500 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Grid3X3 size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{flow.name}</h4>
                        {callFlowId === flow.id && (
                          <span className="px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">Active</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/call-flows/builder/${flow.id}`);
                        }}
                        className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    {flow.description && (
                      <p className="text-sm text-gray-600 mt-1">{flow.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText size={12} /> Structured script
                      </span>
                      {flow._count?.callLogs !== undefined && flow._count.callLogs > 0 && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {flow._count.callLogs} calls
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <Grid3X3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h4 className="font-medium text-gray-700">No workflows created yet</h4>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Create a structured call flow to guide conversations consistently.
            </p>
            <button
              type="button"
              onClick={() => navigate('/call-flows/builder')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Workflow
            </button>
          </div>
        )}
      </div>

      {/* Workflow vs AI Comparison */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">When to use each approach?</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-800">AI Conversation</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Customer support inquiries</li>
              <li>Complex problem-solving</li>
              <li>Personalized recommendations</li>
              <li>Open-ended discussions</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-800">Structured Workflow</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Lead qualification scripts</li>
              <li>Appointment scheduling</li>
              <li>Survey & data collection</li>
              <li>Compliance-required calls</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
