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
import { ViewColumnsIcon, FunnelIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  platformProspectService,
  PlatformProspect,
  ProspectStage,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STAGE_LABELS,
  PROSPECT_STAGE_COLORS,
} from '../../services/platform-prospect.service';
import { platformAnalyticsService, FunnelStep } from '../../services/platform-analytics.service';

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

type ViewMode = 'kanban' | 'funnel' | 'list';

export default function PlatformSalesPipelinePage() {
  const [prospects, setProspects] = useState<PlatformProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<PlatformProspect | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'kanban';
    return (localStorage.getItem('platform-pipeline-view') as ViewMode) || 'kanban';
  });
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [funnelLoading, setFunnelLoading] = useState(false);

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

  const fetchFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const steps = await platformAnalyticsService.conversionFunnel(undefined, {});
      setFunnelSteps(steps);
    } catch (error) {
      console.error('Failed to load funnel', error);
      toast.error('Failed to load funnel');
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (view === 'funnel') {
      fetchFunnel();
    }
  }, [view, fetchFunnel]);

  useEffect(() => {
    localStorage.setItem('platform-pipeline-view', view);
  }, [view]);

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
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-sm text-gray-600 mt-1">
            {view === 'kanban' && 'Drag prospects between stages — changes are saved automatically'}
            {view === 'funnel' && 'Stage-by-stage drop-off across all prospects (counts every prospect that reached the stage)'}
            {view === 'list' && 'Compact list grouped by stage — scan many prospects at once'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{prospects.length}</span>
          </div>
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
                view === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ViewColumnsIcon className="w-4 h-4 mr-1.5" />
              Kanban
            </button>
            <button
              onClick={() => setView('funnel')}
              className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
                view === 'funnel'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FunnelIcon className="w-4 h-4 mr-1.5" />
              Funnel
            </button>
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
                view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bars3Icon className="w-4 h-4 mr-1.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {view === 'kanban' && (
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
      )}
      {view === 'funnel' && <FunnelView steps={funnelSteps} loading={funnelLoading} />}
      {view === 'list' && <ListView grouped={grouped} />}
    </div>
  );
}

function ListView({ grouped }: { grouped: Record<ProspectStage, PlatformProspect[]> }) {
  // Flatten + sort by pipeline stage order (NEW first, CONVERTED/LOST last)
  const stageOrder = new Map(PIPELINE_STAGES.map((s, i) => [s, i]));
  const allProspects = Object.values(grouped)
    .flat()
    .sort((a, b) => {
      const aIdx = stageOrder.get(a.stage) ?? 999;
      const bIdx = stageOrder.get(b.stage) ?? 999;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (allProspects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-sm text-gray-500">
        No prospects yet.
      </div>
    );
  }

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Stage</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Assigned</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allProspects.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/super-admin/prospects/${p.id}`}
                    className="font-medium text-cyan-600 hover:text-cyan-700"
                  >
                    {p.fullName}
                  </Link>
                  <div className="text-xs text-gray-500">{p.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{p.companyName || '—'}</div>
                  {p.industry && (
                    <div className="text-xs text-gray-500">{p.industry}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${PROSPECT_STAGE_COLORS[p.stage]}`}
                  >
                    {PROSPECT_STAGE_LABELS[p.stage]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {PROSPECT_SOURCE_LABELS[p.source]}
                  {p.campaign && (
                    <div className="text-xs text-gray-500">{p.campaign}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {p.assignedTo ? (
                    `${p.assignedTo.firstName} ${p.assignedTo.lastName}`
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      p.score >= 80
                        ? 'bg-green-100 text-green-700'
                        : p.score >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {daysSince(p.createdAt)}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FunnelView({ steps, loading }: { steps: FunnelStep[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }
  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-sm text-gray-500">
        No funnel data yet. Add a few prospects to see drop-off rates.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-3xl">
      <div className="space-y-4">
        {steps.map((step, i) => {
          const prevCount = i === 0 ? step.count : steps[i - 1].count;
          const dropOff = prevCount > 0 ? 1 - step.count / prevCount : 0;
          const width = Math.max(step.pctOfTop * 100, 4);
          const colorClass = PROSPECT_STAGE_COLORS[step.stage] || 'bg-gray-200 text-gray-900';
          return (
            <div key={step.stage}>
              <div className="flex justify-between items-baseline mb-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="font-semibold text-gray-900 text-sm">
                    {PROSPECT_STAGE_LABELS[step.stage]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {step.count} {step.count === 1 ? 'prospect' : 'prospects'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="text-gray-600">{(step.pctOfTop * 100).toFixed(1)}%</span>
                  {i > 0 && dropOff > 0 && (
                    <span className="text-xs text-red-600">
                      ▼ {(dropOff * 100).toFixed(0)}% drop
                    </span>
                  )}
                  {i > 0 && dropOff === 0 && (
                    <span className="text-xs text-gray-400">— no drop</span>
                  )}
                </div>
              </div>
              <div className="relative bg-gray-100 rounded-md h-10 overflow-hidden">
                <div
                  className={`h-full ${colorClass} flex items-center px-3 text-xs font-medium transition-all duration-500`}
                  style={{ width: `${width}%` }}
                >
                  {width > 12 && <span>{step.count}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {steps.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{steps[0].count}</div>
            <div className="text-xs text-gray-500 mt-1">Top of funnel</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{steps[steps.length - 1].count}</div>
            <div className="text-xs text-gray-500 mt-1">Bottom (Converted)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-600">
              {steps[0].count > 0
                ? `${((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(1)}%`
                : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Overall conversion</div>
          </div>
        </div>
      )}
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
