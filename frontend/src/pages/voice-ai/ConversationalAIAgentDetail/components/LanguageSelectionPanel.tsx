/**
 * Language Selection Panel
 *
 * Right-side sliding panel for selecting agent languages
 * Supports "Same as agent" option and multiple language selection
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Plus, Volume2 } from 'lucide-react';
import { CONVERSATIONAL_AI_LANGUAGES } from '../types';

type LanguageMode = 'same_as_agent' | 'custom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  primaryLanguage: string;
  onUpdateLanguages: (languages: string[], primary: string) => void;
  agentLanguage?: string; // The default agent language
}

export function LanguageSelectionPanel({
  isOpen,
  onClose,
  selectedLanguages,
  primaryLanguage,
  onUpdateLanguages,
  agentLanguage = 'en',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedLanguages);
  const [localPrimary, setLocalPrimary] = useState(primaryLanguage);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(
    selectedLanguages.length === 1 && selectedLanguages[0] === agentLanguage ? 'same_as_agent' : 'custom'
  );

  // Sync local state with props when panel opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedLanguages);
      setLocalPrimary(primaryLanguage);
      setLanguageMode(
        selectedLanguages.length === 1 && selectedLanguages[0] === agentLanguage ? 'same_as_agent' : 'custom'
      );
    }
  }, [isOpen, selectedLanguages, primaryLanguage, agentLanguage]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery) return CONVERSATIONAL_AI_LANGUAGES;
    const query = searchQuery.toLowerCase();
    return CONVERSATIONAL_AI_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) || lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleToggleLanguage = (code: string) => {
    if (localSelected.includes(code)) {
      // Don't allow removing primary language
      if (code === localPrimary) return;
      setLocalSelected(localSelected.filter((c) => c !== code));
    } else {
      setLocalSelected([...localSelected, code]);
    }
  };

  const handleSetPrimary = (code: string) => {
    setLocalPrimary(code);
    if (!localSelected.includes(code)) {
      setLocalSelected([...localSelected, code]);
    }
  };

  const handleSave = () => {
    if (languageMode === 'same_as_agent') {
      onUpdateLanguages([agentLanguage], agentLanguage);
    } else {
      onUpdateLanguages(localSelected, localPrimary);
    }
    onClose();
  };

  const handleModeChange = (mode: LanguageMode) => {
    setLanguageMode(mode);
    if (mode === 'same_as_agent') {
      setLocalSelected([agentLanguage]);
      setLocalPrimary(agentLanguage);
    }
  };

  const getAgentLanguageInfo = () => {
    return CONVERSATIONAL_AI_LANGUAGES.find((l) => l.code === agentLanguage);
  };

  const getLanguageByCode = (code: string) => {
    return CONVERSATIONAL_AI_LANGUAGES.find((l) => l.code === code);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Languages</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Language Mode Selection */}
              <div className="space-y-2 mb-3">
                {/* Same as agent option */}
                <button
                  onClick={() => handleModeChange('same_as_agent')}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors text-left ${
                    languageMode === 'same_as_agent'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Volume2 className="w-3 h-3 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-gray-900">Same as agent</div>
                    <div className="text-[10px] text-gray-500">
                      Use the agent's default language ({getAgentLanguageInfo()?.name || agentLanguage})
                    </div>
                  </div>
                  {languageMode === 'same_as_agent' && (
                    <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>

                {/* Custom languages option */}
                <button
                  onClick={() => handleModeChange('custom')}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors text-left ${
                    languageMode === 'custom'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus className="w-3 h-3 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-gray-900">Custom languages</div>
                    <div className="text-[10px] text-gray-500">
                      Select specific languages for this voice
                    </div>
                  </div>
                  {languageMode === 'custom' && (
                    <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              </div>

              {/* Search - Only show when in custom mode */}
              {languageMode === 'custom' && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search languages..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-[11px]"
                  />
                </div>
              )}
            </div>

            {/* Selected Languages - Only show in custom mode */}
            {languageMode === 'custom' && localSelected.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="text-[11px] font-medium text-gray-700 mb-1.5">Selected Languages</h3>
                <div className="flex flex-wrap gap-1.5">
                  {localSelected.map((code) => {
                    const lang = getLanguageByCode(code);
                    if (!lang) return null;
                    return (
                      <div
                        key={code}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] ${
                          code === localPrimary
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-xs">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {code === localPrimary && (
                          <span className="text-[9px] opacity-75">(Primary)</span>
                        )}
                        {code !== localPrimary && (
                          <button
                            onClick={() => handleToggleLanguage(code)}
                            className="ml-0.5 hover:text-red-400"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Same as Agent Summary */}
            {languageMode === 'same_as_agent' && (
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getAgentLanguageInfo()?.flag}</span>
                  <div>
                    <div className="text-[11px] font-medium text-gray-900">{getAgentLanguageInfo()?.name}</div>
                    <div className="text-[10px] text-gray-500">Agent's default language</div>
                  </div>
                </div>
              </div>
            )}

            {/* Language List - Only show in custom mode */}
            {languageMode === 'custom' && (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-1.5">
                  {filteredLanguages.map((language) => {
                    const isSelected = localSelected.includes(language.code);
                    const isPrimary = language.code === localPrimary;

                    return (
                      <div
                        key={language.code}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-gray-100 border border-gray-300'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        onClick={() => handleToggleLanguage(language.code)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{language.flag}</span>
                          <div>
                            <div className="text-[11px] font-medium text-gray-900">{language.name}</div>
                            <div className="text-[10px] text-gray-500">{language.code.toUpperCase()}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSelected && !isPrimary && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(language.code);
                              }}
                              className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Set Primary
                            </button>
                          )}
                          {isPrimary && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-gray-900 text-white rounded">
                              Primary
                            </span>
                          )}
                          {isSelected ? (
                            <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center">
                              <Plus className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredLanguages.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-gray-500">
                    No languages found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}

            {/* Empty state for same_as_agent mode */}
            {languageMode === 'same_as_agent' && (
              <div className="flex-1 flex items-center justify-center px-4 py-6">
                <div className="text-center text-gray-500">
                  <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[11px]">The voice will use the same language as the agent.</p>
                  <p className="text-[10px] mt-1">Select "Custom languages" to configure specific languages.</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">
                  {languageMode === 'same_as_agent'
                    ? 'Using agent language'
                    : `${localSelected.length} language${localSelected.length !== 1 ? 's' : ''} selected`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-[11px] text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-[11px] bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LanguageSelectionPanel;
