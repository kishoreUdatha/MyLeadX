/**
 * Call Details Page
 * Display detailed information about a specific outbound call
 */

import React from 'react';
import { useCallDetails } from './hooks';
import {
  CallDetailsLoading,
  CallDetailsError,
  CallDetailsHeader,
  QuickStats,
  TabButtons,
  TranscriptPanel,
  InfoPanel,
  ContactCard,
  OutcomeCard,
  QualificationCard,
  NotesCard,
  CampaignCard,
} from './components';

export const CallDetailsPage: React.FC = () => {
  const {
    call,
    loading,
    error,
    isPlaying,
    activeTab,
    audioRef,
    setActiveTab,
    togglePlayback,
    handleAudioEnded,
    goBack,
    viewLead,
    viewCampaign,
  } = useCallDetails();

  if (loading) {
    return <CallDetailsLoading />;
  }

  if (error || !call) {
    return <CallDetailsError error={error} onBack={goBack} />;
  }

  return (
    <div>
      <CallDetailsHeader call={call} onBack={goBack} onViewLead={viewLead} />

      <QuickStats
        call={call}
        isPlaying={isPlaying}
        audioRef={audioRef}
        onTogglePlayback={togglePlayback}
        onAudioEnded={handleAudioEnded}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left - Transcript/Details */}
        <div className="lg:col-span-2">
          <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'transcript' ? (
            <TranscriptPanel call={call} />
          ) : (
            <InfoPanel call={call} />
          )}
        </div>

        {/* Right - Cards */}
        <div className="lg:col-span-1 space-y-3">
          <ContactCard call={call} />
          <OutcomeCard call={call} onViewLead={viewLead} />
          <QualificationCard call={call} />
          {call.outcomeNotes && <NotesCard notes={call.outcomeNotes} />}
          {call.campaign && (
            <CampaignCard campaign={call.campaign} onViewCampaign={viewCampaign} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetailsPage;
