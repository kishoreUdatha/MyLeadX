import React, { useState } from 'react';
import { X, Play, Loader2, Search, Star } from 'lucide-react';
import type { VoiceOption } from '../types/voiceAgent.types';
import { voiceOptions } from '../constants/voiceAgent.constants';

interface VoiceSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceOption) => void;
  onTestVoice?: (voiceId: string) => Promise<void>;
}

const VOICE_REGIONS = [
  { id: 'sarvam', label: 'Indian Languages (Sarvam AI)', icon: '🇮🇳' },
  { id: 'ai4bharat', label: 'Indian Languages (AI4Bharat)', icon: '🔓' },
  { id: 'elevenlabs', label: 'Premium Voices', icon: '🎙️' },
  { id: 'india', label: 'English (India)', icon: '🇮🇳' },
  { id: 'international', label: 'International', icon: '🌐' },
  { id: 'custom', label: 'Custom Cloned', icon: '✨' },
];

export const VoiceSelectorPanel: React.FC<VoiceSelectorPanelProps> = ({
  isOpen,
  onClose,
  selectedVoiceId,
  onSelectVoice,
  onTestVoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<string | null>('sarvam');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredVoices = voiceOptions.filter(voice => {
    const matchesSearch = !searchQuery ||
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !activeRegion || voice.region === activeRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    const region = voice.region;
    if (!acc[region]) acc[region] = [];
    acc[region].push(voice);
    return acc;
  }, {} as Record<string, VoiceOption[]>);

  const handleTestVoice = async (voiceId: string) => {
    if (!onTestVoice || playingVoice) return;
    setPlayingVoice(voiceId);
    try {
      await onTestVoice(voiceId);
    } finally {
      setPlayingVoice(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Select Voice</h2>
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
              placeholder="Search voices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Region Tabs */}
        <div className="px-6 py-3 border-b overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveRegion(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !activeRegion
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {VOICE_REGIONS.map((region) => (
              <button
                key={region.id}
                onClick={() => setActiveRegion(region.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeRegion === region.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{region.icon}</span>
                {region.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedVoices).map(([region, voices]) => {
            const regionInfo = VOICE_REGIONS.find(r => r.id === region);
            return (
              <div key={region} className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <span>{regionInfo?.icon}</span>
                  {regionInfo?.label || region}
                </h3>
                <div className="space-y-2">
                  {voices.map((voice) => {
                    const isSelected = voice.id === selectedVoiceId;
                    return (
                      <div
                        key={voice.id}
                        onClick={() => onSelectVoice(voice)}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                                voice.gender === 'female'
                                  ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                                  : voice.gender === 'male'
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
                              }`}
                            >
                              {voice.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900">{voice.name}</span>
                                {voice.recommended && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                )}
                                {voice.provider === 'ai4bharat' && (
                                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded font-medium">
                                    AI4Bharat
                                  </span>
                                )}
                                {voice.provider === 'sarvam' && (
                                  <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded font-medium">
                                    Sarvam
                                  </span>
                                )}
                                {voice.provider === 'elevenlabs' && (
                                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                                    ElevenLabs
                                  </span>
                                )}
                                {voice.provider === 'openai' && (
                                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                                    OpenAI
                                  </span>
                                )}
                                {voice.premium && (
                                  <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                                    Premium
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{voice.description}</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestVoice(voice.id);
                            }}
                            disabled={playingVoice !== null}
                            className={`p-2 rounded-lg transition-colors ${
                              playingVoice === voice.id
                                ? 'bg-blue-100 text-blue-600'
                                : 'hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {playingVoice === voice.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredVoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No voices found matching your search.
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
