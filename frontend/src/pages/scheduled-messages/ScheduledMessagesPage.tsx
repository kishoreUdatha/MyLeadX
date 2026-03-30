/**
 * Scheduled Messages Page
 * Schedule SMS, Email, and WhatsApp messages for future delivery
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import { useScheduledMessages } from './hooks';
import { StatsCards, MessageItem, EmptyState, CreateEditModal } from './components';

export default function ScheduledMessagesPage() {
  const {
    messages,
    stats,
    templates,
    loading,
    typeFilter,
    statusFilter,
    upcomingOnly,
    setTypeFilter,
    setStatusFilter,
    setUpcomingOnly,
    formData,
    formError,
    saving,
    isEditing,
    showCreateModal,
    setFormData,
    setShowCreateModal,
    handleCreateOrUpdate,
    handleEdit,
    handleDelete,
    handleCancel,
    handlePause,
    handleResume,
    resetForm,
  } = useScheduledMessages();

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Messages</h1>
          <p className="text-sm text-slate-600 mt-1">
            Schedule SMS, Email, and WhatsApp messages for future delivery
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5" />
          <span>Schedule Message</span>
        </button>
      </div>

      {/* Stats */}
      {stats && <StatsCards stats={stats} />}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Types</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAUSED">Paused</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Upcoming only</span>
          </label>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <EmptyState onCreateClick={handleOpenCreateModal} />
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onEdit={handleEdit}
              onPause={handlePause}
              onCancel={handleCancel}
              onResume={handleResume}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateEditModal
        isOpen={showCreateModal}
        isEditing={isEditing}
        formData={formData}
        formError={formError}
        saving={saving}
        templates={templates}
        onClose={handleCloseModal}
        onSubmit={handleCreateOrUpdate}
        onFormChange={setFormData}
      />
    </div>
  );
}
