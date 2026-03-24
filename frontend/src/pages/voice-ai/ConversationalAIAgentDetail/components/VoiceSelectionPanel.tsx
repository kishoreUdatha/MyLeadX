/**
 * Voice Selection Panel
 *
 * Right-side sliding panel for selecting AI voices
 * Supports primary voice and additional voices selection
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Play, Pause, Check, Star, ChevronDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { Voice, VOICE_CATEGORIES } from '../types';
import { voiceOptions } from '../../constants/voiceAgent.constants';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

// Convert voiceOptions to Voice type for compatibility
const DEFAULT_VOICES: Voice[] = voiceOptions.map(v => ({
  id: v.id,
  name: v.name,
  description: v.description,
  category: v.region === 'sarvam' ? 'indian' : v.region === 'ai4bharat' ? 'ai4bharat' : v.region === 'elevenlabs' ? 'curated' : v.region,
  labels: { accent: v.region === 'sarvam' || v.region === 'ai4bharat' || v.region === 'india' ? 'indian' : 'american', gender: v.gender, age: 'young' },
  accent: v.region === 'sarvam' || v.region === 'ai4bharat' || v.region === 'india' ? 'Indian' : 'American',
  gender: v.gender,
  age: 'Young',
  use_case: 'conversational',
  preview_url: undefined,
  provider: v.provider as Voice['provider'],
}));

type SelectionMode = 'primary' | 'additional';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: Voice | null;
  onSelectVoice: (voice: Voice) => void;
  additionalVoices?: Voice[];
  onUpdateAdditionalVoices?: (voices: Voice[]) => void;
  mode?: SelectionMode;
}

export function VoiceSelectionPanel({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  additionalVoices = [],
  onUpdateAdditionalVoices,
  mode = 'primary',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(mode);
  const [filters, setFilters] = useState({
    gender: '',
    accent: '',
    age: '',
    useCase: '',
  });

  // Audio ref for playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync selectionMode with mode prop when it changes
  useEffect(() => {
    setSelectionMode(mode);
  }, [mode]);

  // Stop audio when panel closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }
  }, [isOpen]);

  const filteredVoices = useMemo(() => {
    return DEFAULT_VOICES.filter((voice) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !voice.name.toLowerCase().includes(query) &&
          !voice.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Category filter - matches the region from voiceOptions
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'indian') {
          // Filter Indian language voices (Sarvam)
          if (!voice.id.startsWith('sarvam-')) {
            return false;
          }
        } else if (selectedCategory === 'ai4bharat') {
          // Filter AI4Bharat open source Indian language voices
          if (!voice.id.startsWith('ai4bharat-')) {
            return false;
          }
        } else if (selectedCategory === 'india') {
          // Filter English (India) voices
          if (!voice.id.includes('openai-') || voice.category !== 'india') {
            return false;
          }
        } else if (selectedCategory === 'international') {
          // Filter International OpenAI voices
          if (!voice.id.includes('-intl')) {
            return false;
          }
        } else if (selectedCategory === 'elevenlabs') {
          // Filter ElevenLabs premium voices
          if (!voice.id.startsWith('elevenlabs-')) {
            return false;
          }
        } else if (selectedCategory === 'custom') {
          // Filter custom cloned voices
          if (voice.category !== 'custom') {
            return false;
          }
        } else if (voice.category !== selectedCategory) {
          return false;
        }
      }

      // Gender filter
      if (filters.gender && voice.gender !== filters.gender) {
        return false;
      }

      // Accent filter
      if (filters.accent && voice.accent?.toLowerCase() !== filters.accent.toLowerCase()) {
        return false;
      }

      // Age filter
      if (filters.age && voice.age?.toLowerCase() !== filters.age.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, filters]);

  const handlePlayPreview = async (voiceId: string, voiceName: string) => {
    // If already playing this voice, stop it
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setLoadingVoiceId(voiceId);
    setPlayingVoiceId(null);

    try {
      // Find the voice option to get the native language test text
      const voiceOption = voiceOptions.find(v => v.id === voiceId);

      // Use native language test text if available, otherwise use English
      let previewText = voiceOption?.testText || `Hi, I'm ${voiceName}. I can help you engage with your customers in a natural and friendly way.`;

      // If no testText but it's an AI4Bharat voice, use language-appropriate greeting
      if (!voiceOption?.testText && voiceId.startsWith('ai4bharat-')) {
        const language = voiceOption?.language || 'hi-IN';
        const ai4bharatGreetings: Record<string, string> = {
          'hi-IN': `Namaste! Main ${voiceName} hoon. Main aapki AI sahaayak hoon.`,
          'te-IN': `Namaskaram! Nenu ${voiceName}. Nenu mee AI sahaayakuraalini.`,
          'ta-IN': `Vanakkam! Naan ${voiceName}. Naan ungal AI udhaviyaalar.`,
          'kn-IN': `Namaskara! Naanu ${voiceName}. Naanu nimma AI sahaayaki.`,
          'ml-IN': `Namaskkaram! Njan ${voiceName}. Njan ningalude AI sahayi aanu.`,
          'mr-IN': `Namaskar! Mi ${voiceName}. Mi tumchi AI sahaayak aahe.`,
          'bn-IN': `Namaskar! Ami ${voiceName}. Ami apnar AI sahayak.`,
          'gu-IN': `Kem cho! Hu ${voiceName} chhu. Hu tamari AI sahaayak chhu.`,
        };
        previewText = ai4bharatGreetings[language] || previewText;
      }

      // If no testText but it's a Sarvam voice, use language-appropriate greeting
      if (!voiceOption?.testText && voiceId.startsWith('sarvam-')) {
        const language = voiceOption?.language || 'hi-IN';
        const greetings: Record<string, string> = {
          'hi-IN': `Namaste! Main ${voiceName} hoon. Main aapki AI sahaayak hoon. Aaj main aapki kaise madad kar sakti hoon?`,
          'te-IN': `Namaskaram! Nenu ${voiceName}. Nenu mee AI sahaayakuraalini. Ee roju mee ki ela sahaayam cheyagalanu?`,
          'ta-IN': `Vanakkam! Naan ${voiceName}. Naan ungal AI udhaviyaalar. Inru ungalukku eppadi udhavi seiya mudiyum?`,
          'kn-IN': `Namaskara! Naanu ${voiceName}. Naanu nimma AI sahaayaki. Ivattu nimge hege sahaaya maadaballe?`,
          'ml-IN': `Namaskkaram! Njan ${voiceName}. Njan ningalude AI sahayi aanu. Innu ninakku njan engane sahaayikkum?`,
          'mr-IN': `Namaskar! Mi ${voiceName}. Mi tumchi AI sahaayak aahe. Aaj mi tumhala kashi madad karu?`,
          'bn-IN': `Namaskar! Ami ${voiceName}. Ami apnar AI sahayak. Aaj ami apnake kibhabe sahajya korte pari?`,
          'gu-IN': `Kem cho! Hu ${voiceName} chhu. Hu tamari AI sahaayak chhu. Tamne kem madad kari shaku?`,
          'pa-IN': `Sat Sri Akal! Main ${voiceName} haan. Main tuhadi AI sahaayak haan. Tuhanu ki madad chahidi hai?`,
          'or-IN': `Namaskar! Mu ${voiceName}. Mu apananka AI sahaayak. Apananku kemiti sahajya kariba?`,
          'as-IN': `Namaskar! Moi ${voiceName}. Moi apunar AI sahayak. Apunok kenekoi sahaay korim?`,
          'ur-IN': `Assalam-o-Alaikum! Main ${voiceName} hoon. Main aapki AI sahaayak hoon. Aaj main aapki kaise madad kar sakti hoon?`,
        };
        previewText = greetings[language] || previewText;
      }

      // Determine provider and language from voice ID
      let provider = 'openai';
      let voice = voiceId;
      let language = voiceOption?.language || 'en-US';

      // ElevenLabs voice IDs are typically 21 characters
      if (voiceId.startsWith('elevenlabs-')) {
        provider = 'elevenlabs';
        voice = voiceId;
      } else if (voiceId.length >= 20 && !voiceId.startsWith('openai-') && !voiceId.startsWith('sarvam-') && !voiceId.startsWith('ai4bharat-')) {
        provider = 'elevenlabs';
        voice = `elevenlabs-${voiceId}`;
      } else if (voiceId.startsWith('sarvam-')) {
        provider = 'sarvam';
      } else if (voiceId.startsWith('ai4bharat-')) {
        provider = 'ai4bharat';
      }

      const response = await api.post(
        '/voice-ai/tts',
        { text: previewText, voice, provider, language },
        { responseType: 'blob' }
      );

      // Create audio URL from blob
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setLoadingVoiceId(null);
        setPlayingVoiceId(voiceId);
      };

      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setLoadingVoiceId(null);
        setPlayingVoiceId(null);
        toast.error('Failed to play voice preview');
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error: any) {
      console.error('Failed to play voice preview:', error);
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);

      // Show user-friendly error
      if (error.response?.status === 404) {
        toast.error('Voice preview not available');
      } else if (error.response?.status === 401) {
        toast.error('Please login to preview voices');
      } else {
        toast.error('Failed to load voice preview');
      }
    }
  };

  const handleSelect = (voice: Voice) => {
    if (selectionMode === 'primary') {
      onSelectVoice(voice);
      onClose();
    } else {
      // Additional voice mode
      if (onUpdateAdditionalVoices) {
        const isAlreadyAdded = additionalVoices.some((v) => v.id === voice.id);
        if (!isAlreadyAdded && voice.id !== selectedVoice?.id) {
          onUpdateAdditionalVoices([...additionalVoices, voice]);
        }
      }
    }
  };

  const handleRemoveAdditionalVoice = (voiceId: string) => {
    if (onUpdateAdditionalVoices) {
      onUpdateAdditionalVoices(additionalVoices.filter((v) => v.id !== voiceId));
    }
  };

  const isVoiceSelected = (voice: Voice) => {
    if (selectionMode === 'primary') {
      return selectedVoice?.id === voice.id;
    }
    return additionalVoices.some((v) => v.id === voice.id);
  };

  const isVoiceDisabled = (voice: Voice) => {
    // Can't add primary voice as additional
    if (selectionMode === 'additional' && voice.id === selectedVoice?.id) {
      return true;
    }
    return false;
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
                <h2 className="text-sm font-semibold text-gray-900">
                  {selectionMode === 'primary' ? 'Select a voice' : 'Add Additional Voice'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Mode Toggle */}
              {onUpdateAdditionalVoices && (
                <div className="flex items-center gap-1.5 mb-3">
                  <button
                    onClick={() => setSelectionMode('primary')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      selectionMode === 'primary'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Primary Voice
                  </button>
                  <button
                    onClick={() => setSelectionMode('additional')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                      selectionMode === 'additional'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Add Additional Voice
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-[11px]"
                />
              </div>
            </div>

            {/* Current Voice Selection Summary */}
            {selectedVoice && (
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-500">Primary Voice</div>
                    <div className="text-[11px] font-medium text-gray-900">{selectedVoice.name}</div>
                  </div>
                </div>
                {additionalVoices.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500 mb-1.5">Additional Voices ({additionalVoices.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {additionalVoices.map((voice) => (
                        <div
                          key={voice.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full text-[10px]"
                        >
                          <span>{voice.name}</span>
                          <button
                            onClick={() => handleRemoveAdditionalVoice(voice.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Categories */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {VOICE_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-900"
              >
                <span>Filters</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {/* Gender Filter */}
                      <select
                        value={filters.gender}
                        onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                        className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Any Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>

                      {/* Accent Filter */}
                      <select
                        value={filters.accent}
                        onChange={(e) => setFilters({ ...filters, accent: e.target.value })}
                        className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Any Accent</option>
                        <option value="american">American</option>
                        <option value="british">British</option>
                        <option value="australian">Australian</option>
                        <option value="indian">Indian</option>
                      </select>

                      {/* Age Filter */}
                      <select
                        value={filters.age}
                        onChange={(e) => setFilters({ ...filters, age: e.target.value })}
                        className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Any Age</option>
                        <option value="young">Young</option>
                        <option value="middle-aged">Middle-aged</option>
                        <option value="old">Old</option>
                      </select>

                      {/* Use Case Filter */}
                      <select
                        value={filters.useCase}
                        onChange={(e) => setFilters({ ...filters, useCase: e.target.value })}
                        className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Any Use Case</option>
                        <option value="narration">Narration</option>
                        <option value="conversational">Conversational</option>
                        <option value="news">News</option>
                        <option value="characters">Characters</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-2">
                {filteredVoices.map((voice) => {
                  const isSelected = isVoiceSelected(voice);
                  const isDisabled = isVoiceDisabled(voice);
                  const isPrimary = voice.id === selectedVoice?.id;

                  return (
                    <div
                      key={voice.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isDisabled
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-gray-900 bg-gray-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && handleSelect(voice)}
                    >
                      <div className="flex items-start gap-2">
                        {/* Play Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPreview(voice.id, voice.name);
                          }}
                          disabled={loadingVoiceId !== null && loadingVoiceId !== voice.id}
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            playingVoiceId === voice.id
                              ? 'bg-gray-900 text-white'
                              : loadingVoiceId === voice.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                          }`}
                        >
                          {loadingVoiceId === voice.id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : playingVoiceId === voice.id ? (
                            <Pause className="w-2.5 h-2.5" />
                          ) : (
                            <Play className="w-2.5 h-2.5 ml-0.5" />
                          )}
                        </button>

                        {/* Voice Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[11px] font-medium text-gray-900">{voice.name}</h3>
                            {isPrimary && (
                              <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded-full">
                                Primary
                              </span>
                            )}
                            {!isPrimary && isSelected && selectionMode === 'additional' && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded-full">
                                Additional
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                            {voice.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {/* Provider Badge */}
                            {voice.provider === 'ai4bharat' && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full font-medium">
                                AI4Bharat
                              </span>
                            )}
                            {voice.provider === 'sarvam' && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded-full font-medium">
                                Sarvam
                              </span>
                            )}
                            {voice.provider === 'elevenlabs' && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] rounded-full font-medium">
                                ElevenLabs
                              </span>
                            )}
                            {voice.provider === 'openai' && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded-full font-medium">
                                OpenAI
                              </span>
                            )}
                            {voice.accent && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded-full">
                                {voice.accent}
                              </span>
                            )}
                            {voice.gender && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded-full capitalize">
                                {voice.gender}
                              </span>
                            )}
                            {voice.age && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded-full">
                                {voice.age}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0">
                          {selectionMode === 'additional' && !isPrimary && (
                            isSelected ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAdditionalVoice(voice.id);
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(voice);
                                }}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )
                          )}
                          {selectionMode === 'primary' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Toggle favorite
                              }}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Star className="w-3 h-3 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredVoices.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-gray-500">
                    No voices found matching your criteria
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">
                  {selectionMode === 'primary'
                    ? `${filteredVoices.length} voices available`
                    : `${additionalVoices.length} additional voice${additionalVoices.length !== 1 ? 's' : ''} selected`}
                </span>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-[11px] bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default VoiceSelectionPanel;
