/**
 * Webhooks Page
 * Manage webhook subscriptions for real-time event notifications
 */

import { useWebhooks } from './hooks';
import {
  LoadingState,
  Header,
  EmptyState,
  SecretModal,
  WebhooksList,
  CreateWebhookModal,
  DeliveryLogsModal,
} from './components';

export default function WebhooksPage() {
  const {
    webhooks,
    events,
    loading,
    showCreateModal,
    showLogsModal,
    selectedWebhook,
    deliveryLogs,
    newWebhookSecret,
    formData,
    formError,
    saving,
    setShowCreateModal,
    handleCreateWebhook,
    handleDeleteWebhook,
    handleToggleWebhook,
    handleTestWebhook,
    handleRegenerateSecret,
    viewLogs,
    handleRetryDelivery,
    toggleEvent,
    selectAllInCategory,
    closeCreateModal,
    closeSecretModal,
    closeLogsModal,
    copySecret,
    setFormData,
  } = useWebhooks();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <Header onAddClick={() => setShowCreateModal(true)} />

      {/* Secret Display Modal */}
      {newWebhookSecret && (
        <SecretModal
          secret={newWebhookSecret}
          onCopy={copySecret}
          onClose={closeSecretModal}
        />
      )}

      {/* Webhooks List or Empty State */}
      {webhooks.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <WebhooksList
          webhooks={webhooks}
          onViewLogs={viewLogs}
          onTest={handleTestWebhook}
          onRegenerateSecret={handleRegenerateSecret}
          onToggle={handleToggleWebhook}
          onDelete={handleDeleteWebhook}
        />
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && !newWebhookSecret && (
        <CreateWebhookModal
          formData={formData}
          events={events}
          formError={formError}
          saving={saving}
          onFormChange={setFormData}
          onToggleEvent={toggleEvent}
          onSelectAllInCategory={selectAllInCategory}
          onCreate={handleCreateWebhook}
          onClose={closeCreateModal}
        />
      )}

      {/* Delivery Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <DeliveryLogsModal
          webhook={selectedWebhook}
          logs={deliveryLogs}
          onRetry={handleRetryDelivery}
          onClose={closeLogsModal}
        />
      )}
    </div>
  );
}
