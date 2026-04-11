import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowRight,
  Zap,
  Clock,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  AlertCircle,
} from 'lucide-react';

interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  order: number;
  description?: string;
  automations: StageAutomation[];
  isDefault?: boolean;
  exitCriteria?: string[];
}

interface StageAutomation {
  id: string;
  trigger: 'on_enter' | 'on_exit' | 'after_duration';
  action: 'send_email' | 'send_sms' | 'send_whatsapp' | 'assign_user' | 'create_task' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

interface Workflow {
  id: string;
  name: string;
  type: 'admission' | 'sales' | 'support' | 'custom';
  stages: WorkflowStage[];
  isActive: boolean;
  description?: string;
}

const STAGE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

const AUTOMATION_TRIGGERS = [
  { value: 'on_enter', label: 'When entering stage', icon: ArrowRight },
  { value: 'on_exit', label: 'When exiting stage', icon: ArrowRight },
  { value: 'after_duration', label: 'After time in stage', icon: Clock },
];

const AUTOMATION_ACTIONS = [
  { value: 'send_email', label: 'Send Email', icon: FileText },
  { value: 'send_sms', label: 'Send SMS', icon: FileText },
  { value: 'send_whatsapp', label: 'Send WhatsApp', icon: FileText },
  { value: 'assign_user', label: 'Assign to User', icon: Users },
  { value: 'create_task', label: 'Create Task', icon: FileText },
  { value: 'webhook', label: 'Call Webhook', icon: Zap },
];

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'admission',
    name: 'Admission Workflow',
    type: 'admission',
    description: 'Track student admissions from enquiry to enrollment',
    isActive: true,
    stages: [
      { id: '1', name: 'New Enquiry', color: '#3B82F6', order: 0, automations: [], isDefault: true },
      { id: '2', name: 'Contacted', color: '#06B6D4', order: 1, automations: [] },
      { id: '3', name: 'Campus Visit Scheduled', color: '#8B5CF6', order: 2, automations: [] },
      { id: '4', name: 'Application Submitted', color: '#F59E0B', order: 3, automations: [] },
      { id: '5', name: 'Documents Pending', color: '#F97316', order: 4, automations: [] },
      { id: '6', name: 'Under Review', color: '#EC4899', order: 5, automations: [] },
      { id: '7', name: 'Offer Made', color: '#10B981', order: 6, automations: [] },
      { id: '8', name: 'Enrolled', color: '#22C55E', order: 7, automations: [], isDefault: true },
      { id: '9', name: 'Lost', color: '#EF4444', order: 8, automations: [], isDefault: true },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Pipeline',
    type: 'sales',
    description: 'Standard sales pipeline for lead conversion',
    isActive: true,
    stages: [
      { id: '1', name: 'New Lead', color: '#3B82F6', order: 0, automations: [], isDefault: true },
      { id: '2', name: 'Qualified', color: '#06B6D4', order: 1, automations: [] },
      { id: '3', name: 'Meeting Scheduled', color: '#8B5CF6', order: 2, automations: [] },
      { id: '4', name: 'Proposal Sent', color: '#F59E0B', order: 3, automations: [] },
      { id: '5', name: 'Negotiation', color: '#F97316', order: 4, automations: [] },
      { id: '6', name: 'Won', color: '#10B981', order: 5, automations: [], isDefault: true },
      { id: '7', name: 'Lost', color: '#EF4444', order: 6, automations: [], isDefault: true },
    ],
  },
];

export default function WorkflowConfigPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(DEFAULT_WORKFLOWS[0]);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [showAutomationModal, setShowAutomationModal] = useState<{
    stageId: string;
    automation?: StageAutomation;
  } | null>(null);
  const [draggedStage, setDraggedStage] = useState<string | null>(null);

  const [newStage, setNewStage] = useState<Partial<WorkflowStage>>({
    name: '',
    color: STAGE_COLORS[0],
    description: '',
  });

  const [newAutomation, setNewAutomation] = useState<Partial<StageAutomation>>({
    trigger: 'on_enter',
    action: 'send_email',
    enabled: true,
    config: {},
  });

  const handleAddStage = () => {
    if (!selectedWorkflow || !newStage.name) return;

    const stage: WorkflowStage = {
      id: Date.now().toString(),
      name: newStage.name,
      color: newStage.color || STAGE_COLORS[0],
      order: selectedWorkflow.stages.length,
      description: newStage.description,
      automations: [],
    };

    const updatedWorkflow = {
      ...selectedWorkflow,
      stages: [...selectedWorkflow.stages, stage],
    };

    setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? updatedWorkflow : w)));
    setSelectedWorkflow(updatedWorkflow);
    setNewStage({ name: '', color: STAGE_COLORS[0], description: '' });
    setShowAddStage(false);
  };

  const handleUpdateStage = (stageId: string, updates: Partial<WorkflowStage>) => {
    if (!selectedWorkflow) return;

    const updatedStages = selectedWorkflow.stages.map(s =>
      s.id === stageId ? { ...s, ...updates } : s
    );

    const updatedWorkflow = { ...selectedWorkflow, stages: updatedStages };
    setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? updatedWorkflow : w)));
    setSelectedWorkflow(updatedWorkflow);
    setEditingStage(null);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!selectedWorkflow) return;

    const stage = selectedWorkflow.stages.find(s => s.id === stageId);
    if (stage?.isDefault) {
      alert('Cannot delete default stages');
      return;
    }

    const updatedStages = selectedWorkflow.stages
      .filter(s => s.id !== stageId)
      .map((s, index) => ({ ...s, order: index }));

    const updatedWorkflow = { ...selectedWorkflow, stages: updatedStages };
    setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? updatedWorkflow : w)));
    setSelectedWorkflow(updatedWorkflow);
  };

  const handleDragStart = (stageId: string) => {
    setDraggedStage(stageId);
  };

  const handleDragOver = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedStage || draggedStage === targetStageId || !selectedWorkflow) return;

    const stages = [...selectedWorkflow.stages];
    const draggedIndex = stages.findIndex(s => s.id === draggedStage);
    const targetIndex = stages.findIndex(s => s.id === targetStageId);

    const [draggedItem] = stages.splice(draggedIndex, 1);
    stages.splice(targetIndex, 0, draggedItem);

    const reorderedStages = stages.map((s, index) => ({ ...s, order: index }));

    const updatedWorkflow = { ...selectedWorkflow, stages: reorderedStages };
    setSelectedWorkflow(updatedWorkflow);
  };

  const handleDragEnd = () => {
    if (selectedWorkflow) {
      setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? selectedWorkflow : w)));
    }
    setDraggedStage(null);
  };

  const toggleStageExpand = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const handleAddAutomation = (stageId: string) => {
    if (!selectedWorkflow || !newAutomation.trigger || !newAutomation.action) return;

    const automation: StageAutomation = {
      id: Date.now().toString(),
      trigger: newAutomation.trigger as StageAutomation['trigger'],
      action: newAutomation.action as StageAutomation['action'],
      config: newAutomation.config || {},
      enabled: true,
    };

    const updatedStages = selectedWorkflow.stages.map(s =>
      s.id === stageId ? { ...s, automations: [...s.automations, automation] } : s
    );

    const updatedWorkflow = { ...selectedWorkflow, stages: updatedStages };
    setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? updatedWorkflow : w)));
    setSelectedWorkflow(updatedWorkflow);
    setShowAutomationModal(null);
    setNewAutomation({ trigger: 'on_enter', action: 'send_email', enabled: true, config: {} });
  };

  const handleDeleteAutomation = (stageId: string, automationId: string) => {
    if (!selectedWorkflow) return;

    const updatedStages = selectedWorkflow.stages.map(s =>
      s.id === stageId
        ? { ...s, automations: s.automations.filter(a => a.id !== automationId) }
        : s
    );

    const updatedWorkflow = { ...selectedWorkflow, stages: updatedStages };
    setWorkflows(workflows.map(w => (w.id === selectedWorkflow.id ? updatedWorkflow : w)));
    setSelectedWorkflow(updatedWorkflow);
  };

  const handleDuplicateWorkflow = (workflow: Workflow) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (Copy)`,
      stages: workflow.stages.map(s => ({
        ...s,
        id: `${Date.now()}-${s.id}`,
        automations: s.automations.map(a => ({ ...a, id: `${Date.now()}-${a.id}` })),
      })),
    };
    setWorkflows([...workflows, newWorkflow]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Workflow Configuration</h1>
        <p className="text-slate-600 mt-1">
          Customize your admission and sales pipelines with stages and automations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workflow Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-4">Workflows</h3>
            <div className="space-y-2">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkflow?.id === workflow.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{workflow.name}</p>
                      <p className="text-xs text-slate-500">{workflow.stages.length} stages</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDuplicateWorkflow(workflow);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Duplicate workflow"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newWorkflow: Workflow = {
                  id: Date.now().toString(),
                  name: 'New Workflow',
                  type: 'custom',
                  stages: [
                    { id: '1', name: 'New', color: '#3B82F6', order: 0, automations: [], isDefault: true },
                    { id: '2', name: 'In Progress', color: '#F59E0B', order: 1, automations: [] },
                    { id: '3', name: 'Complete', color: '#10B981', order: 2, automations: [], isDefault: true },
                  ],
                  isActive: true,
                };
                setWorkflows([...workflows, newWorkflow]);
                setSelectedWorkflow(newWorkflow);
              }}
              className="w-full mt-4 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Workflow
            </button>
          </div>
        </div>

        {/* Workflow Editor */}
        <div className="lg:col-span-3">
          {selectedWorkflow ? (
            <div className="bg-white rounded-lg border border-slate-200">
              {/* Workflow Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <input
                      type="text"
                      value={selectedWorkflow.name}
                      onChange={e => {
                        const updated = { ...selectedWorkflow, name: e.target.value };
                        setSelectedWorkflow(updated);
                        setWorkflows(workflows.map(w => (w.id === updated.id ? updated : w)));
                      }}
                      className="text-xl font-bold text-slate-900 border-none focus:outline-none focus:ring-0 p-0"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedWorkflow.type.charAt(0).toUpperCase() + selectedWorkflow.type.slice(1)} workflow
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedWorkflow.isActive}
                        onChange={e => {
                          const updated = { ...selectedWorkflow, isActive: e.target.checked };
                          setSelectedWorkflow(updated);
                          setWorkflows(workflows.map(w => (w.id === updated.id ? updated : w)));
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-600">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Stages List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900">Pipeline Stages</h3>
                  <button
                    onClick={() => setShowAddStage(true)}
                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stage
                  </button>
                </div>

                {/* Visual Pipeline */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {selectedWorkflow.stages
                    .sort((a, b) => a.order - b.order)
                    .map((stage, index) => (
                      <div key={stage.id} className="flex items-center">
                        <div
                          className="px-3 py-1.5 rounded-full text-white text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: stage.color }}
                        >
                          {stage.name}
                        </div>
                        {index < selectedWorkflow.stages.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400 mx-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                </div>

                {/* Detailed Stages */}
                <div className="space-y-3">
                  {selectedWorkflow.stages
                    .sort((a, b) => a.order - b.order)
                    .map(stage => (
                      <div
                        key={stage.id}
                        draggable={!stage.isDefault}
                        onDragStart={() => handleDragStart(stage.id)}
                        onDragOver={e => handleDragOver(e, stage.id)}
                        onDragEnd={handleDragEnd}
                        className={`border rounded-lg transition-all ${
                          draggedStage === stage.id ? 'opacity-50' : ''
                        } ${
                          expandedStages.has(stage.id)
                            ? 'border-primary-200 bg-primary-50/30'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="p-3 flex items-center gap-3">
                          {!stage.isDefault && (
                            <div className="cursor-grab text-slate-400 hover:text-slate-600">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          {stage.isDefault && <div className="w-4" />}

                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />

                          {editingStage?.id === stage.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingStage.name}
                                onChange={e =>
                                  setEditingStage({ ...editingStage, name: e.target.value })
                                }
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                autoFocus
                              />
                              <select
                                value={editingStage.color}
                                onChange={e =>
                                  setEditingStage({ ...editingStage, color: e.target.value })
                                }
                                className="px-2 py-1 border border-slate-300 rounded text-sm"
                              >
                                {STAGE_COLORS.map(color => (
                                  <option key={color} value={color}>
                                    {color}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleUpdateStage(stage.id, editingStage)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingStage(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">{stage.name}</span>
                                  {stage.isDefault && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                                      System
                                    </span>
                                  )}
                                  {stage.automations.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      {stage.automations.length}
                                    </span>
                                  )}
                                </div>
                                {stage.description && (
                                  <p className="text-sm text-slate-500">{stage.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleStageExpand(stage.id)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                >
                                  {expandedStages.has(stage.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingStage(stage)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {!stage.isDefault && (
                                  <button
                                    onClick={() => handleDeleteStage(stage.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded Content - Automations */}
                        {expandedStages.has(stage.id) && (
                          <div className="border-t border-slate-200 p-3 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-slate-700">
                                Stage Automations
                              </h4>
                              <button
                                onClick={() => setShowAutomationModal({ stageId: stage.id })}
                                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add Automation
                              </button>
                            </div>

                            {stage.automations.length === 0 ? (
                              <p className="text-sm text-slate-500 italic">
                                No automations configured
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {stage.automations.map(automation => (
                                  <div
                                    key={automation.id}
                                    className="flex items-center justify-between bg-white p-2 rounded border border-slate-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-amber-500" />
                                      <span className="text-sm text-slate-700">
                                        {AUTOMATION_TRIGGERS.find(t => t.value === automation.trigger)?.label}
                                        {' → '}
                                        {AUTOMATION_ACTIONS.find(a => a.value === automation.action)?.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          handleDeleteAutomation(stage.id, automation.id)
                                        }
                                        className="p-1 text-slate-400 hover:text-red-600"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Add Stage Form */}
                {showAddStage && (
                  <div className="mt-4 p-4 border border-primary-200 rounded-lg bg-primary-50/30">
                    <h4 className="font-medium text-slate-900 mb-3">Add New Stage</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Stage Name</label>
                        <input
                          type="text"
                          value={newStage.name}
                          onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                          placeholder="e.g., Interview Scheduled"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Color</label>
                        <div className="flex gap-1 flex-wrap">
                          {STAGE_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setNewStage({ ...newStage, color })}
                              className={`w-6 h-6 rounded-full border-2 ${
                                newStage.color === color
                                  ? 'border-slate-900'
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={newStage.description}
                          onChange={e => setNewStage({ ...newStage, description: e.target.value })}
                          placeholder="Optional description"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowAddStage(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddStage}
                        disabled={!newStage.name}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                      >
                        Add Stage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a workflow to configure</p>
            </div>
          )}
        </div>
      </div>

      {/* Automation Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Add Stage Automation</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
                <select
                  value={newAutomation.trigger}
                  onChange={e =>
                    setNewAutomation({ ...newAutomation, trigger: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {AUTOMATION_TRIGGERS.map(trigger => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select
                  value={newAutomation.action}
                  onChange={e =>
                    setNewAutomation({ ...newAutomation, action: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {AUTOMATION_ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>

              {newAutomation.trigger === 'after_duration' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={newAutomation.config?.hours || 24}
                    onChange={e =>
                      setNewAutomation({
                        ...newAutomation,
                        config: { ...newAutomation.config, hours: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Configure detailed action settings after adding the automation.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAutomationModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddAutomation(showAutomationModal.stageId)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
