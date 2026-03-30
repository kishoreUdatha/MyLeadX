/**
 * Templates Page
 * Create and manage templates for SMS, Email, and WhatsApp messages
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import { useTemplates } from './hooks';
import {
  FiltersBar,
  TemplateCard,
  EmptyState,
  CreateEditModal,
  PreviewModal,
} from './components';

export default function TemplatesPage() {
  const {
    templates,
    variables,
    categories,
    loading,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    formData,
    setFormData,
    formError,
    saving,
    isEditing,
    smsInfo,
    showCreateModal,
    setShowCreateModal,
    showPreviewModal,
    selectedTemplate,
    previewData,
    handleCreateOrUpdate,
    handleDelete,
    handleDuplicate,
    handlePreview,
    handleEdit,
    resetForm,
    insertVariable,
    updateSmsInfo,
    closePreviewModal,
  } = useTemplates();

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
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
          <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage templates for SMS, Email, and WhatsApp messages
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5" />
          <span>Create Template</span>
        </button>
      </div>

      {/* Filters */}
      <FiltersBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
      />

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <EmptyState onCreateClick={handleOpenCreateModal} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
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
        setFormData={setFormData}
        formError={formError}
        saving={saving}
        categories={categories}
        variables={variables}
        smsInfo={smsInfo}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateOrUpdate}
        onInsertVariable={insertVariable}
        onUpdateSmsInfo={updateSmsInfo}
      />

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        template={selectedTemplate}
        previewData={previewData}
        onClose={closePreviewModal}
      />
    </div>
  );
}
