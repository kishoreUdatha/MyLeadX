/**
 * Voice Settings Panel
 *
 * Slide-in panel for common voice settings
 */

import { useState } from 'react';
import { X, Settings, ChevronDown, Plus } from 'lucide-react';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TTS_FORMATS = [
  { value: 'pcm_16000', label: 'PCM 16000 Hz', recommended: true },
  { value: 'pcm_22050', label: 'PCM 22050 Hz', recommended: false },
  { value: 'pcm_24000', label: 'PCM 24000 Hz', recommended: false },
  { value: 'pcm_44100', label: 'PCM 44100 Hz', recommended: false },
  { value: 'mp3_44100', label: 'MP3 44100 Hz', recommended: false },
];

const LATENCY_OPTIONS = [0, 1, 2, 3, 4];

export function VoiceSettingsPanel({ isOpen, onClose }: VoiceSettingsPanelProps) {
  const [ttsFormat, setTtsFormat] = useState('pcm_16000');
  const [latency, setLatency] = useState(3);
  const [textNormalization, setTextNormalization] = useState<'system_prompt' | 'elevenlabs'>('system_prompt');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedFormat = TTS_FORMATS.find(f => f.value === ttsFormat);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-900">Common voice settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* TTS Output Format */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-1">TTS output format</h3>
            <p className="text-[11px] text-gray-500 mb-2">
              Select the output format you want to use for ElevenLabs text to speech.
            </p>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-900">{selectedFormat?.label}</span>
                  {selectedFormat?.recommended && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {TTS_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => {
                        setTtsFormat(format.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                        format.value === ttsFormat ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span className="text-[11px] text-gray-900">{format.label}</span>
                      {format.recommended && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                          Recommended
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optimize Streaming Latency */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-1">Optimize streaming latency</h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Latency for speech generation can be optimized at the cost of quality.
            </p>

            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              {LATENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setLatency(option)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                    latency === option
                      ? 'bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 -m-px z-10'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Pronunciation Dictionaries */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-1">Pronunciation dictionaries</h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Lexicon dictionaries apply case-sensitive pronunciation replacements.{' '}
              <a href="#" className="text-gray-900 underline underline-offset-2">IPA and CMU phonemes</a>
              {' '}only work with English models.{' '}
              <a href="#" className="text-gray-900 underline underline-offset-2">Learn more</a>.
            </p>

            <button className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Plus className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] text-gray-500">Add dictionary</span>
            </button>
          </div>

          {/* Text Normalisation Type */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-1">Text normalisation type (voice only)</h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Before sending text to our TTS models we convert numbers to words for better results. Select which method will be used for this agent.{' '}
              <a href="#" className="text-gray-900 underline underline-offset-2">Learn more</a>
            </p>

            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setTextNormalization('system_prompt')}
                className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                  textNormalization === 'system_prompt'
                    ? 'bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 -m-px z-10'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                System prompt
              </button>
              <button
                onClick={() => setTextNormalization('elevenlabs')}
                className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                  textNormalization === 'elevenlabs'
                    ? 'bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 -m-px z-10'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                ElevenLabs
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default VoiceSettingsPanel;
