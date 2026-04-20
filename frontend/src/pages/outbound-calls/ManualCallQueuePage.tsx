/**
 * Manual Call Queue Page
 * Interface for manually dialing contacts from a campaign queue
 * Now supports browser-based softphone calling
 */

import React, { useState } from 'react';
import { useManualCallQueue } from './hooks';
import {
  LoadingState,
  ErrorBanner,
  Header,
  ContactList,
  ContactDetailsPanel,
  ScheduleModal,
} from './components';
import { Softphone } from '../../components/Softphone';
import { useSoftphone } from '../../hooks/useSoftphone';

export const ManualCallQueuePage: React.FC = () => {
  const {
    campaign,
    contacts,
    stats,
    loading,
    error,
    selectedContact,
    setSelectedContact,
    callingContact,
    showScheduleModal,
    scheduleData,
    setScheduleData,
    openScheduleModal,
    closeScheduleModal,
    filter,
    setFilter,
    fetchQueue,
    handleCall,
    handleSkip,
    handleSchedule,
    handleDNC,
    handleStartCampaign,
    navigateBack,
    navigateToLead,
    clearError,
  } = useManualCallQueue();

  // Softphone state - shows the softphone widget when a contact is selected
  const [showSoftphone, setShowSoftphone] = useState(true);

  // Get softphone hook for status
  const { isRegistered, status: softphoneStatus, isOnCall } = useSoftphone({
    autoRegister: true,
  });

  // Handle call with softphone
  const handleSoftphoneCallStart = (callId: string) => {
    console.log('[ManualCallQueue] Softphone call started:', callId);
  };

  const handleSoftphoneCallEnd = (callId: string, duration?: number) => {
    console.log('[ManualCallQueue] Softphone call ended:', callId, duration);
    // Refresh the queue after call ends
    fetchQueue();
  };

  if (loading && !campaign) {
    return <LoadingState />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <Header
        campaign={campaign}
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={fetchQueue}
        onStartCampaign={handleStartCampaign}
        onBack={navigateBack}
      />

      {/* Error */}
      {error && <ErrorBanner error={error} onClear={clearError} />}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List */}
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          callingContact={callingContact}
          onSelectContact={setSelectedContact}
          onCall={handleCall}
        />

        {/* Contact Details Panel */}
        <ContactDetailsPanel
          contact={selectedContact}
          callingContact={callingContact}
          onCall={handleCall}
          onSchedule={openScheduleModal}
          onSkip={handleSkip}
          onDNC={handleDNC}
          onNavigateToLead={navigateToLead}
        />
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          scheduleData={scheduleData}
          onUpdate={setScheduleData}
          onSubmit={handleSchedule}
          onClose={closeScheduleModal}
        />
      )}

      {/* Softphone Widget - Shows when contact is selected */}
      {showSoftphone && selectedContact && (
        <Softphone
          phoneNumber={selectedContact.phone}
          contactName={selectedContact.name || `${selectedContact.lead?.firstName || ''} ${selectedContact.lead?.lastName || ''}`.trim() || undefined}
          leadId={selectedContact.lead?.id}
          campaignId={campaign?.id}
          contactId={selectedContact.id}
          onCallStart={handleSoftphoneCallStart}
          onCallEnd={handleSoftphoneCallEnd}
          showAsWidget={true}
          position="bottom-right"
          minimizable={true}
        />
      )}
    </div>
  );
};

export default ManualCallQueuePage;
