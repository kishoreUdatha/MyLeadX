/**
 * Step 2: Select Industry
 */

import { ArrowLeft } from 'lucide-react';
import { AgentFormData, INDUSTRIES } from '../types';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepIndustry({ formData, onUpdate, onNext, onBack }: Props) {
  const handleSelect = (industryId: string) => {
    onUpdate({ industry: industryId });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">What industry is your business in?</h1>
      <p className="text-gray-600 mb-8">Select the industry that best describes your business</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {INDUSTRIES.map((industry) => (
          <button
            key={industry.id}
            onClick={() => handleSelect(industry.id)}
            className={`p-6 border-2 rounded-xl text-center transition-all hover:border-gray-400 hover:shadow-sm ${
              formData.industry === industry.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-3xl mb-3">{industry.icon}</div>
            <div className="font-medium text-gray-900">{industry.name}</div>
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

export default StepIndustry;
