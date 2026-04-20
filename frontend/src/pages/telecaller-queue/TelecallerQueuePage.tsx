/**
 * Telecaller Queue Page
 * AI-qualified leads ready for telecaller follow-up
 * Now with browser-based softphone calling
 */

import { useTelecallerQueue } from './hooks';
import {
  Header,
  StatsCards,
  QueueList,
  LeadDetailsPanel,
  CompleteModal,
} from './components';
import { Softphone } from '../../components/Softphone';

export default function TelecallerQueuePage() {
  const {
    user,
    items,
    stats,
    isLoading,
    selectedItem,
    showCompleteModal,
    completeForm,
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
  } = useTelecallerQueue();

  return (
    <div className="space-y-6">
      <Header onRefresh={loadData} />

      {stats && <StatsCards stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <QueueList
            items={items}
            isLoading={isLoading}
            selectedItemId={selectedItem?.id || null}
            userId={user?.id}
            onSelectItem={setSelectedItem}
            onClaim={handleClaim}
            onCall={makeCall}
          />
        </div>

        {/* Lead Details Panel */}
        <div className="lg:col-span-1">
          <LeadDetailsPanel
            item={selectedItem}
            userId={user?.id}
            onCall={makeCall}
            onComplete={openCompleteModal}
            onSkip={handleSkip}
            onRelease={handleRelease}
            onClaim={handleClaim}
          />
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && selectedItem && (
        <CompleteModal
          item={selectedItem}
          formData={completeForm}
          onFormChange={updateCompleteForm}
          onComplete={handleComplete}
          onClose={closeCompleteModal}
        />
      )}

      {/* Softphone Widget - Browser-based calling */}
      {selectedItem && selectedItem.assignedToId === user?.id && (
        <Softphone
          phoneNumber={selectedItem.phoneNumber}
          contactName={selectedItem.contactName || undefined}
          leadId={selectedItem.leadId || undefined}
          onCallStart={(callId) => console.log('[Telecaller] Call started:', callId)}
          onCallEnd={(callId, duration) => {
            console.log('[Telecaller] Call ended:', callId, duration);
            // Refresh queue after call
            loadData();
          }}
          showAsWidget={true}
          position="bottom-right"
          minimizable={true}
        />
      )}
    </div>
  );
}
