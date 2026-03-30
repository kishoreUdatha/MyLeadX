/**
 * Telecaller Queue Hook
 * Manages queue state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  telecallerQueueService,
  TelecallerQueueItem,
  QueueStats,
} from '../../../services/telecallerQueue.service';
import toast from 'react-hot-toast';
import { CompleteFormData } from '../telecaller-queue.types';
import { INITIAL_COMPLETE_FORM, REFRESH_INTERVAL } from '../telecaller-queue.constants';

export function useTelecallerQueue() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [items, setItems] = useState<TelecallerQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TelecallerQueueItem | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState<CompleteFormData>(INITIAL_COMPLETE_FORM);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [queueData, statsData] = await Promise.all([
        telecallerQueueService.getQueue({ limit: 50 }),
        telecallerQueueService.getStats(),
      ]);
      setItems(queueData.items);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleClaim = useCallback(async (item: TelecallerQueueItem) => {
    try {
      const updated = await telecallerQueueService.claimItem(item.id);
      setItems(prev => prev.map((i) => (i.id === item.id ? updated : i)));
      setSelectedItem(updated);
      toast.success('Item claimed! Ready to call.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim item');
    }
  }, []);

  const handleRelease = useCallback(async (item: TelecallerQueueItem) => {
    try {
      await telecallerQueueService.releaseItem(item.id);
      setSelectedItem(null);
      loadData();
      toast.success('Item released back to queue');
    } catch (error: any) {
      toast.error(error.message || 'Failed to release item');
    }
  }, [loadData]);

  const handleSkip = useCallback(async (item: TelecallerQueueItem) => {
    const reason = prompt('Reason for skipping (optional):');
    try {
      await telecallerQueueService.skipItem(item.id, reason || undefined);
      setSelectedItem(null);
      loadData();
      toast.success('Item skipped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip item');
    }
  }, [loadData]);

  const handleComplete = useCallback(async () => {
    if (!selectedItem || !completeForm.outcome) {
      toast.error('Please select an outcome');
      return;
    }

    try {
      let callbackScheduled: string | undefined;
      if (completeForm.outcome === 'CALLBACK_SET' && completeForm.callbackDate) {
        callbackScheduled = `${completeForm.callbackDate}T${completeForm.callbackTime || '10:00'}:00`;
      }

      await telecallerQueueService.completeItem(selectedItem.id, {
        telecallerOutcome: completeForm.outcome,
        telecallerNotes: completeForm.notes || undefined,
        callbackScheduled,
      });

      setShowCompleteModal(false);
      setSelectedItem(null);
      setCompleteForm(INITIAL_COMPLETE_FORM);
      loadData();
      toast.success('Item completed!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete item');
    }
  }, [selectedItem, completeForm, loadData]);

  const makeCall = useCallback((phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  }, []);

  const openCompleteModal = useCallback(() => {
    setShowCompleteModal(true);
  }, []);

  const closeCompleteModal = useCallback(() => {
    setShowCompleteModal(false);
  }, []);

  const updateCompleteForm = useCallback((updates: Partial<CompleteFormData>) => {
    setCompleteForm(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    user,
    items,
    stats,
    isLoading,
    selectedItem,
    showCompleteModal,
    completeForm,

    // Actions
    loadData,
    setSelectedItem,
    handleClaim,
    handleRelease,
    handleSkip,
    handleComplete,
    makeCall,
    openCompleteModal,
    closeCompleteModal,
    updateCompleteForm,
  };
}
