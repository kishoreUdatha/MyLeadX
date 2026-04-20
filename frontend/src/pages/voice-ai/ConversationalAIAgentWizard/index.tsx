/**
 * Conversational AI Agent Creation Wizard
 *
 * Multi-step wizard for creating AI voice agents
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AgentFormData, INITIAL_FORM_DATA, WizardStep } from './types';
import { StepAgentType } from './steps/StepAgentType';
import { StepIndustry } from './steps/StepIndustry';
import { StepUseCase } from './steps/StepUseCase';
import { StepKnowledgeBase } from './steps/StepKnowledgeBase';
import { StepComplete } from './steps/StepComplete';
import { AgentCreationProgress } from './components/AgentCreationProgress';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Agent Type', completed: false, current: true },
  { id: 2, title: 'Industry', completed: false, current: false },
  { id: 3, title: 'Use Case', completed: false, current: false },
  { id: 4, title: 'Knowledge Base', completed: false, current: false },
  { id: 5, title: 'Complete', completed: false, current: false },
];

export function ConversationalAIAgentWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AgentFormData>(INITIAL_FORM_DATA);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string[]>([]);

  const updateFormData = useCallback((updates: Partial<AgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const goToNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  }, []);

  const goToPrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSkip = useCallback(() => {
    goToNextStep();
  }, [goToNextStep]);

  const handleCreateAgent = useCallback(async () => {
    setIsCreating(true);
    setCreationProgress([]);

    try {
      // Step 1: Generate system prompt
      setCreationProgress(prev => [...prev, 'Generating system prompts...']);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Create workflow
      setCreationProgress(prev => [...prev, 'Creating workflow...']);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 3: Generate testing
      setCreationProgress(prev => [...prev, 'Generating testing scenarios...']);
      await new Promise(resolve => setTimeout(resolve, 700));

      // Step 4: Set up evaluation
      setCreationProgress(prev => [...prev, 'Setting up evaluation criteria...']);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Create agent on backend
      setCreationProgress(prev => [...prev, 'Finalizing agent...']);

      const response = await api.post('/conversational-ai/agents', {
        name: formData.name,
        industry: formData.industry,
        useCase: formData.useCase,
        systemPrompt: formData.systemPrompt || generateSystemPrompt(formData),
        firstMessage: formData.firstMessage || generateFirstMessage(formData),
        voiceId: formData.primaryVoice?.id || 'voice-21m00Tcm4TlvDq8ikWAM',
        language: formData.language,
        llm: formData.llm,
        website: formData.website,
        mainGoal: formData.mainGoal,
        knowledgeBase: formData.knowledgeBase,
        phoneNumberId: formData.phoneNumberId || null, // Assign phone number to agent
      });

      setCreationProgress(prev => [...prev, 'Agent created successfully!']);

      toast.success('Agent created successfully!');

      // Navigate to agent detail page
      const agentId = response.data?.data?.voiceBridgeAgentId || response.data?.voiceBridgeAgentId;
      setTimeout(() => {
        navigate(`/voice-ai/agents/${agentId}`);
      }, 1000);

    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toast.error(error.response?.data?.message || 'Failed to create agent');
      setIsCreating(false);
    }
  }, [formData, navigate]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepAgentType
            formData={formData}
            onUpdate={updateFormData}
            onNext={goToNextStep}
          />
        );
      case 2:
        return (
          <StepIndustry
            formData={formData}
            onUpdate={updateFormData}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 3:
        return (
          <StepUseCase
            formData={formData}
            onUpdate={updateFormData}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 4:
        return (
          <StepKnowledgeBase
            formData={formData}
            onUpdate={updateFormData}
            onNext={goToNextStep}
            onBack={goToPrevStep}
            onSkip={handleSkip}
          />
        );
      case 5:
        return (
          <StepComplete
            formData={formData}
            onUpdate={updateFormData}
            onBack={goToPrevStep}
            onCreate={handleCreateAgent}
            isCreating={isCreating}
          />
        );
      default:
        return null;
    }
  };

  if (isCreating) {
    return <AgentCreationProgress steps={creationProgress} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate('/voice-ai')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Agents</span>
          </button>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2">
          {WIZARD_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  step.id < currentStep
                    ? 'bg-green-500'
                    : step.id === currentStep
                    ? 'bg-gray-900'
                    : 'bg-gray-300'
                }`}
              />
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <main className="max-w-5xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helper functions to generate prompts
function generateSystemPrompt(formData: AgentFormData): string {
  const industryName = formData.industry.replace(/_/g, ' ');
  const useCaseName = formData.useCase.replace(/_/g, ' ');

  return `### Personality
You are a friendly and knowledgeable ${useCaseName} advisor for a ${industryName} organization. You are personable, patient, and genuinely interested in understanding the prospect's needs. You are an expert in various programs and opportunities, and you aim to provide helpful information without being pushy.

### Goals
${formData.mainGoal}

### Guidelines
- Be warm and professional in all interactions
- Listen actively and ask clarifying questions
- Provide accurate information based on your knowledge base
- If you don't know something, be honest and offer to connect them with a human representative
- Always maintain a helpful and positive tone`;
}

function generateFirstMessage(_formData: AgentFormData): string {
  return `[warmly] Hello there! My name is Alex, and I'm calling from {{institution_name}} today. I wanted to briefly reach out regarding some of our exciting programs, as you'd previously shown a little interest.`;
}

export default ConversationalAIAgentWizard;
