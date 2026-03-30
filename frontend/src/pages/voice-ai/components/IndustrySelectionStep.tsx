import React from 'react';
import { industryDetails } from '../constants/voiceAgent.constants';
import type { Template } from '../types/voiceAgent.types';

interface IndustrySelectionStepProps {
  templates: Template[];
  selectedIndustry: string | null;
  onSelectIndustry: (industry: string) => void;
  onNext: () => void;
}

export const IndustrySelectionStep: React.FC<IndustrySelectionStepProps> = ({
  templates,
  selectedIndustry,
  onSelectIndustry,
  onNext,
}) => {
  const industries = Object.keys(industryDetails);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Industry</h2>
      <p className="text-gray-600 mb-8">Choose an industry template to get started quickly</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {industries.map((industry) => {
          const detail = industryDetails[industry];
          const template = templates.find(t => t.industry === industry);
          const isSelected = selectedIndustry === industry;

          return (
            <button
              key={industry}
              onClick={() => onSelectIndustry(industry)}
              className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">{detail.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {template?.name || industry.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-gray-500">{detail.description}</p>
            </button>
          );
        })}
      </div>

      {selectedIndustry && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={onNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue to Configure
          </button>
        </div>
      )}
    </div>
  );
};
