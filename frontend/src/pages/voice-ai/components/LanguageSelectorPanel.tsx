import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import type { LanguageOption } from '../types/voiceAgent.types';
import { languageOptions } from '../constants/voiceAgent.constants';

interface LanguageSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguageId: string;
  onSelectLanguage: (language: LanguageOption) => void;
}

export const LanguageSelectorPanel: React.FC<LanguageSelectorPanelProps> = ({
  isOpen,
  onClose,
  selectedLanguageId,
  onSelectLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = languageOptions.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularLanguages = filteredLanguages.filter(l => l.popular);
  const otherLanguages = filteredLanguages.filter(l => !l.popular);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Select Language</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Language List */}
        <div className="flex-1 overflow-y-auto p-6">
          {popularLanguages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Popular</h3>
              <div className="space-y-2">
                {popularLanguages.map((language) => {
                  const isSelected = language.id === selectedLanguageId;
                  return (
                    <button
                      key={language.id}
                      onClick={() => {
                        onSelectLanguage(language);
                        onClose();
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{language.flag}</span>
                        <span className="font-medium text-gray-900">{language.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {otherLanguages.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Other Languages</h3>
              <div className="space-y-2">
                {otherLanguages.map((language) => {
                  const isSelected = language.id === selectedLanguageId;
                  return (
                    <button
                      key={language.id}
                      onClick={() => {
                        onSelectLanguage(language);
                        onClose();
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{language.flag}</span>
                        <span className="font-medium text-gray-900">{language.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLanguages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No languages found matching your search.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};
