/**
 * Step 3: Select Use Case
 */

import { ArrowLeft } from 'lucide-react';
import { AgentFormData, USE_CASES, UseCase } from '../types';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepUseCase({ formData, onUpdate, onNext, onBack }: Props) {
  // Get use cases for selected industry, fallback to default
  const useCases: UseCase[] = USE_CASES[formData.industry] || USE_CASES.default;

  const handleSelect = (useCaseId: string) => {
    onUpdate({ useCase: useCaseId });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Use case</h1>
      <p className="text-gray-600 mb-8">What will your agent help with?</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            onClick={() => handleSelect(useCase.id)}
            className={`p-6 border-2 rounded-xl text-center transition-all hover:border-gray-400 hover:shadow-sm ${
              formData.useCase === useCase.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-3xl mb-3">{useCase.icon}</div>
            <div className="font-medium text-gray-900">{useCase.name}</div>
          </button>
        ))}
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>
    </div>
  );
}

export default StepUseCase;
