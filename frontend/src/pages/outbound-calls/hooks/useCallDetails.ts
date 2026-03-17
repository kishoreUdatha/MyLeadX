/**
 * Call Details Hook
 * Manages call details fetching and audio playback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { CallDetails, ActiveTab } from '../call-details.types';

export function useCallDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCallDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/outbound-calls/calls/${id}`);
      if (response.data.success) {
        const callData = response.data.data;

        if (typeof callData.transcript === 'string') {
          try {
            callData.transcript = JSON.parse(callData.transcript);
          } catch {
            callData.transcript = null;
          }
        }

        if (typeof callData.qualification === 'string') {
          try {
            callData.qualification = JSON.parse(callData.qualification);
          } catch {
            callData.qualification = null;
          }
        }

        setCall(callData);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch call details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCallDetails();
  }, [fetchCallDetails]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const goBack = useCallback(() => {
    navigate('/outbound-calls');
  }, [navigate]);

  const viewLead = useCallback((leadId: string) => {
    navigate(`/leads/${leadId}`);
  }, [navigate]);

  const viewCampaign = useCallback((campaignId: string) => {
    navigate(`/outbound-calls/campaigns/${campaignId}`);
  }, [navigate]);

  return {
    // State
    call,
    loading,
    error,
    isPlaying,
    activeTab,
    audioRef,
    // Actions
    setActiveTab,
    togglePlayback,
    handleAudioEnded,
    goBack,
    viewLead,
    viewCampaign,
  };
}
