/**
 * Platform Sales Pipeline (Kanban)
 *
 * Drag-and-drop Kanban board for moving platform prospects through stages.
 * Drop a card on a different column → calls changeStage backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import {
  platformProspectService,
  PlatformProspect,
  ProspectStage,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STAGE_LABELS,
} from '../../services/platform-prospect.service';

const PIPELINE_STAGES: ProspectStage[] = [
  'NEW',
  'MQL',
  'SQL',
  'DEMO_SCHEDULED',
  'DEMO_DONE',
  'PROPOSAL_SENT',
  'NEGOTIATING',
  'TRIAL_STARTED',
  'CONVERTED',
  'LOST',
];

const COLUMN_HEADER_COLORS: Record<ProspectStage, string> = {
  NEW: 'bg-gray-200 text-gray-900',
  MQL: 'bg-blue-200 text-blue-900',
  SQL: 'bg-indigo-200 text-indigo-900',
  DEMO_SCHEDULED: 'bg-purple-200 text-purple-900',
  DEMO_DONE: 'bg-violet-200 text-violet-900',
  PROPOSAL_SENT: 'bg-yellow-200 text-yellow-900',
  NEGOTIATING: 'bg-orange-200 text-orange-900',
  TRIAL_STARTED: 'bg-cyan-200 text-cyan-900',
  CONVERTED: 'bg-green-200 text-green-900',
  LOST: 'bg-red-200 text-red-900',
  UNRESPONSIVE: 'bg-slate-200 text-slate-900',
};

export default function PlatformSalesPipelinePage() {
  const [prospects, setProspects] = useState<PlatformProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<PlatformProspect | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const result = await platformProspectService.list({ pageSize: 100 });
      setProspects(result.items);
    } catch (error) {
      console.error('Failed to load pipeline', error);
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const card = prospects.find((p) => p.id === id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const prospectId = active.id as string;
    const newStage = over.id as ProspectStage;
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) return;
    if (prospect.stage === newStage) return;

    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, stage: newStage } : p)),
    );

    try {
      await platformProspectService.changeStage(prospectId, newStage);
      toast.success(`Moved to ${PROSPECT_STAGE_LABELS[newStage]}`);
    } catch {
      toast.error('Failed to change stage — reverting');
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, stage: prospect.stage } : p)),
      );
    }
  };

  const grouped = PIPELINE_STAGES.reduce<Record<ProspectStage, PlatformProspect[]>>(
    (acc, stage) => {
      acc[stage] = prospects.filter((p) => p.stage === stage);
      return acc;
    },
    {} as Record<ProspectStage, PlatformProspect[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drag prospects between stages — changes are saved automatically
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{prospects.length}</span>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              prospects={grouped[stage] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <ProspectCard prospect={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  stage,
  prospects,
}: {
  stage: ProspectStage;
  prospects: PlatformProspect[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-slate-50 rounded-lg flex flex-col max-h-[calc(100vh-180px)] ${
        isOver ? 'ring-2 ring-cyan-400' : ''
      }`}
    >
      <div className={`px-3 py-2 rounded-t-lg flex justify-between items-center ${COLUMN_HEADER_COLORS[stage]}`}>
        <h3 className="font-semibold text-sm">{PROSPECT_STAGE_LABELS[stage]}</h3>
        <span className="text-xs font-medium bg-white/40 rounded-full px-2 py-0.5">
          {prospects.length}
        </span>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {prospects.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No prospects</div>
        ) : (
          prospects.map((p) => <ProspectCard key={p.id} prospect={p} />)
        )}
      </div>
    </div>
  );
}

function ProspectCard({
  prospect,
  dragging = false,
}: {
  prospect: PlatformProspect;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: prospect.id,
  });

  const daysAgo = Math.floor(
    (Date.now() - new Date(prospect.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-md shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging && !dragging ? 'opacity-50' : ''
      } ${dragging ? 'rotate-2 shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-start gap-2">
        <Link
          to={`/super-admin/prospects/${prospect.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-gray-900 text-sm hover:text-cyan-600 truncate"
        >
          {prospect.fullName}
        </Link>
        {prospect.score > 0 ? (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              prospect.score >= 80
                ? 'bg-green-100 text-green-700'
                : prospect.score >= 50
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {prospect.score}
          </span>
        ) : null}
      </div>
      {prospect.companyName ? (
        <div className="text-xs text-gray-600 mt-0.5 truncate">{prospect.companyName}</div>
      ) : null}
      <div className="flex justify-between items-center mt-2 text-xs">
        <span className="text-gray-500 truncate">
          {PROSPECT_SOURCE_LABELS[prospect.source]}
        </span>
        <span className="text-gray-400 flex-shrink-0">{daysAgo}d</span>
      </div>
      {prospect.assignedTo ? (
        <div className="text-xs text-gray-500 mt-1 truncate">
          → {prospect.assignedTo.firstName} {prospect.assignedTo.lastName}
        </div>
      ) : null}
    </div>
  );
}
