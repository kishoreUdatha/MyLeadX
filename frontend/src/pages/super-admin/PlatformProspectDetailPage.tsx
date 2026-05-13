import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  UserIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ClockIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  platformProspectService,
  PlatformProspect,
  ProspectActivity,
  ProspectStage,
  ProspectActivityType,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STAGE_LABELS,
  PROSPECT_STAGE_COLORS,
} from '../../services/platform-prospect.service';

type ProspectDetail = PlatformProspect & {
  activities: ProspectActivity[];
  demos?: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    meetingUrl?: string;
    host?: { firstName: string; lastName: string };
  }>;
};

export default function PlatformProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<ProspectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await platformProspectService.getById(id);
      setProspect(data as ProspectDetail);
    } catch (error) {
      console.error('Failed to load prospect', error);
      toast.error('Failed to load prospect');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Prospect not found.</p>
        <Link to="/super-admin/prospects" className="text-cyan-600 hover:underline mt-2 inline-block">
          ← Back to prospects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          to="/super-admin/prospects"
          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to prospects
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{prospect.fullName}</h1>
            {prospect.companyName ? (
              <p className="text-gray-600 mt-1">{prospect.companyName}{prospect.designation ? ` · ${prospect.designation}` : ''}</p>
            ) : null}
            <div className="flex gap-4 mt-3 text-sm">
              <a href={`mailto:${prospect.email}`} className="text-cyan-600 hover:underline inline-flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1" /> {prospect.email}
              </a>
              <a href={`tel:${prospect.phone}`} className="text-cyan-600 hover:underline inline-flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1" /> {prospect.phone}
              </a>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-3 py-1 rounded text-sm font-medium ${PROSPECT_STAGE_COLORS[prospect.stage]}`}>
              {PROSPECT_STAGE_LABELS[prospect.stage]}
            </span>
            <div className="text-sm text-gray-500 mt-2">
              AI Score: <span className="font-medium text-gray-900">{prospect.score}</span>/100
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100">
          <ActionButton icon={DocumentTextIcon} onClick={() => setShowNoteModal(true)}>
            Add Note
          </ActionButton>
          <ActionButton icon={PhoneIcon} onClick={() => setShowCallModal(true)}>
            Log Call
          </ActionButton>
          <ActionButton icon={ArrowRightIcon} onClick={() => setShowStageModal(true)}>
            Move Stage
          </ActionButton>
          <ActionButton icon={EnvelopeIcon} onClick={() => toast('Email integration coming in Phase 6')}>
            Email
          </ActionButton>
          <ActionButton icon={ChatBubbleLeftIcon} onClick={() => toast('WhatsApp integration coming in Phase 6')}>
            WhatsApp
          </ActionButton>
          <ActionButton icon={CalendarDaysIcon} onClick={() => toast('Demo scheduling coming in Phase 4b')}>
            Schedule Demo
          </ActionButton>
          {!prospect.organizationId ? (
            <button
              onClick={() => setShowConvertModal(true)}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium ml-auto"
            >
              <RocketLaunchIcon className="w-4 h-4 mr-1.5" />
              Convert to Trial
            </button>
          ) : (
            <span className="inline-flex items-center px-3 py-2 text-sm text-green-700 ml-auto">
              <CheckBadgeIcon className="w-4 h-4 mr-1" />
              Already converted
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Activity Timeline</h2>
            </div>
            <div className="p-6">
              {prospect.activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No activity yet.</p>
              ) : (
                <ActivityTimeline activities={prospect.activities} />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <DetailCard title="Contact">
            <DetailRow label="Email" value={prospect.email} />
            <DetailRow label="Phone" value={prospect.phone} />
            <DetailRow label="Company" value={prospect.companyName || '—'} />
            <DetailRow label="Designation" value={prospect.designation || '—'} />
            <DetailRow label="Team Size" value={prospect.teamSize || '—'} />
            <DetailRow label="Industry" value={prospect.industry || '—'} />
            <DetailRow label="Current CRM" value={prospect.currentCrm || '—'} />
          </DetailCard>

          <DetailCard title="Attribution">
            <DetailRow label="Source" value={PROSPECT_SOURCE_LABELS[prospect.source]} />
            <DetailRow label="Campaign" value={prospect.campaign || '—'} />
            <DetailRow label="Medium" value={prospect.medium || '—'} />
            {prospect.adName ? <DetailRow label="Ad" value={prospect.adName} /> : null}
            {prospect.eventName ? <DetailRow label="Event" value={prospect.eventName} /> : null}
            {prospect.referrerName ? <DetailRow label="Referred by" value={prospect.referrerName} /> : null}
          </DetailCard>

          <DetailCard title="Lifecycle">
            <DetailRow label="Created" value={formatDate(prospect.createdAt)} />
            <DetailRow label="First Response" value={formatDate(prospect.firstResponseAt)} />
            <DetailRow label="Demo Scheduled" value={formatDate(prospect.demoScheduledAt)} />
            <DetailRow label="Trial Started" value={formatDate(prospect.trialStartedAt)} />
            <DetailRow label="Converted" value={formatDate(prospect.convertedAt)} />
            <DetailRow label="Lost" value={formatDate(prospect.lostAt)} />
            {prospect.lostReason ? <DetailRow label="Lost Reason" value={prospect.lostReason} /> : null}
          </DetailCard>

          <DetailCard title="Assignment">
            <DetailRow
              label="Assigned To"
              value={
                prospect.assignedTo
                  ? `${prospect.assignedTo.firstName} ${prospect.assignedTo.lastName}`
                  : 'Unassigned'
              }
            />
            <DetailRow label="Assigned At" value={formatDate(prospect.assignedAt)} />
          </DetailCard>

          {prospect.organization ? (
            <DetailCard title="Linked Tenant">
              <DetailRow label="Org" value={prospect.organization.name} />
              <DetailRow label="Slug" value={prospect.organization.slug} />
              <Link
                to={`/super-admin/organizations/${prospect.organization.id}`}
                className="text-cyan-600 hover:underline text-sm inline-block mt-2"
              >
                View tenant →
              </Link>
            </DetailCard>
          ) : null}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <button
              onClick={async () => {
                if (!confirm('Delete this prospect? This cannot be undone.')) return;
                try {
                  await platformProspectService.delete(prospect.id);
                  toast.success('Prospect deleted');
                  navigate('/super-admin/prospects');
                } catch {
                  toast.error('Failed to delete');
                }
              }}
              className="text-sm text-red-600 hover:text-red-700 w-full text-left"
            >
              Delete prospect
            </button>
          </div>
        </div>
      </div>

      {showNoteModal && (
        <NoteModal
          prospectId={prospect.id}
          onClose={() => setShowNoteModal(false)}
          onSaved={() => {
            setShowNoteModal(false);
            refresh();
          }}
        />
      )}
      {showCallModal && (
        <CallModal
          prospectId={prospect.id}
          onClose={() => setShowCallModal(false)}
          onSaved={() => {
            setShowCallModal(false);
            refresh();
          }}
        />
      )}
      {showStageModal && (
        <StageModal
          prospect={prospect}
          onClose={() => setShowStageModal(false)}
          onSaved={() => {
            setShowStageModal(false);
            refresh();
          }}
        />
      )}
      {showConvertModal && (
        <ConvertModal
          prospect={prospect}
          onClose={() => setShowConvertModal(false)}
          onSaved={() => {
            setShowConvertModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
    >
      <Icon className="w-4 h-4 mr-1.5" />
      {children}
    </button>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right break-words max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ActivityTimeline({ activities }: { activities: ProspectActivity[] }) {
  return (
    <ol className="space-y-4">
      {activities.map((a) => (
        <li key={a.id} className="flex gap-3">
          <div className="flex-shrink-0">
            <ActivityIcon type={a.type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{describeActivity(a)}</span>
              {a.user ? (
                <span className="text-gray-500"> by {a.user.firstName} {a.user.lastName}</span>
              ) : null}
            </div>
            {a.noteContent ? (
              <div className="mt-1 text-sm text-gray-700 bg-gray-50 rounded p-2">
                {a.noteContent}
              </div>
            ) : null}
            {a.callOutcome || a.callDurationSeconds ? (
              <div className="mt-1 text-xs text-gray-600">
                {a.callOutcome ? `Outcome: ${a.callOutcome}` : null}
                {a.callOutcome && a.callDurationSeconds ? ' · ' : null}
                {a.callDurationSeconds ? `${Math.round(a.callDurationSeconds / 60)} min` : null}
              </div>
            ) : null}
            <div className="text-xs text-gray-400 mt-1">{formatDate(a.createdAt)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActivityIcon({ type }: { type: ProspectActivityType }) {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center';
  switch (type) {
    case 'CALL':
      return <div className={`${base} bg-green-100`}><PhoneIcon className="w-4 h-4 text-green-700" /></div>;
    case 'EMAIL':
      return <div className={`${base} bg-blue-100`}><EnvelopeIcon className="w-4 h-4 text-blue-700" /></div>;
    case 'WHATSAPP':
    case 'SMS':
      return <div className={`${base} bg-emerald-100`}><ChatBubbleLeftIcon className="w-4 h-4 text-emerald-700" /></div>;
    case 'NOTE':
      return <div className={`${base} bg-yellow-100`}><DocumentTextIcon className="w-4 h-4 text-yellow-700" /></div>;
    case 'DEMO_SCHEDULED':
    case 'DEMO_COMPLETED':
      return <div className={`${base} bg-purple-100`}><CalendarDaysIcon className="w-4 h-4 text-purple-700" /></div>;
    case 'TASK':
      return <div className={`${base} bg-orange-100`}><ClockIcon className="w-4 h-4 text-orange-700" /></div>;
    case 'STAGE_CHANGE':
      return <div className={`${base} bg-indigo-100`}><ArrowRightIcon className="w-4 h-4 text-indigo-700" /></div>;
    case 'ASSIGNMENT_CHANGE':
      return <div className={`${base} bg-gray-100`}><UserIcon className="w-4 h-4 text-gray-700" /></div>;
    case 'FORM_SUBMITTED':
      return <div className={`${base} bg-cyan-100`}><CheckBadgeIcon className="w-4 h-4 text-cyan-700" /></div>;
    default:
      return <div className={`${base} bg-gray-100`}><XCircleIcon className="w-4 h-4 text-gray-500" /></div>;
  }
}

function describeActivity(a: ProspectActivity): string {
  switch (a.type) {
    case 'CALL':
      return 'Logged a call';
    case 'EMAIL':
      return a.emailDirection === 'INBOUND' ? 'Received email' : 'Sent email';
    case 'WHATSAPP':
      return 'WhatsApp message';
    case 'SMS':
      return 'SMS message';
    case 'NOTE':
      return 'Added a note';
    case 'DEMO_SCHEDULED':
      return 'Scheduled a demo';
    case 'DEMO_COMPLETED':
      return 'Completed a demo';
    case 'TASK':
      return a.taskTitle ? `Task: ${a.taskTitle}` : 'Added a task';
    case 'STAGE_CHANGE':
      return `Stage changed: ${a.fromStage || '—'} → ${a.toStage || '—'}`;
    case 'ASSIGNMENT_CHANGE':
      return 'Assignment changed';
    case 'FORM_SUBMITTED':
      return 'Form submitted';
    case 'EMAIL_OPENED':
      return 'Email opened';
    case 'EMAIL_CLICKED':
      return 'Email link clicked';
    default:
      return a.type;
  }
}

function NoteModal({
  prospectId,
  onClose,
  onSaved,
}: {
  prospectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!note.trim()) {
      toast.error('Note cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await platformProspectService.logActivity(prospectId, 'NOTE', { noteContent: note });
      toast.success('Note added');
      onSaved();
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Note" onClose={onClose}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        placeholder="What did you discuss?"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
        autoFocus
      />
      <ModalActions saving={saving} onCancel={onClose} onSubmit={submit} submitLabel="Save note" />
    </Modal>
  );
}

function CallModal({
  prospectId,
  onClose,
  onSaved,
}: {
  prospectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('CONNECTED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await platformProspectService.logActivity(prospectId, 'CALL', {
        callDurationSeconds: duration ? parseInt(duration, 10) * 60 : undefined,
        callOutcome: outcome,
        noteContent: notes || undefined,
      });
      toast.success('Call logged');
      onSaved();
    } catch {
      toast.error('Failed to log call');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Log Call" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="CONNECTED">Connected</option>
            <option value="NO_ANSWER">No answer</option>
            <option value="BUSY">Busy</option>
            <option value="CALLBACK_REQUESTED">Callback requested</option>
            <option value="WRONG_NUMBER">Wrong number</option>
            <option value="VOICEMAIL">Left voicemail</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>
      <ModalActions saving={saving} onCancel={onClose} onSubmit={submit} submitLabel="Log call" />
    </Modal>
  );
}

const STAGES: ProspectStage[] = [
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
  'UNRESPONSIVE',
];

function StageModal({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: PlatformProspect;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newStage, setNewStage] = useState<ProspectStage>(prospect.stage);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (newStage === prospect.stage) {
      toast('Stage unchanged');
      return;
    }
    setSaving(true);
    try {
      await platformProspectService.changeStage(prospect.id, newStage, reason || undefined);
      toast.success(`Moved to ${PROSPECT_STAGE_LABELS[newStage]}`);
      onSaved();
    } catch {
      toast.error('Failed to change stage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Move Stage" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current stage</label>
          <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${PROSPECT_STAGE_COLORS[prospect.stage]}`}>
            {PROSPECT_STAGE_LABELS[prospect.stage]}
          </span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Move to</label>
          <select
            value={newStage}
            onChange={(e) => setNewStage(e.target.value as ProspectStage)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason {newStage === 'LOST' ? '(required)' : '(optional)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={newStage === 'LOST' ? 'e.g., Chose a competitor, price too high...' : ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>
      <ModalActions saving={saving} onCancel={onClose} onSubmit={submit} submitLabel="Move stage" />
    </Modal>
  );
}

function ConvertModal({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: PlatformProspect;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [planId, setPlanId] = useState('starter');
  const [trialDurationDays, setTrialDurationDays] = useState(14);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    organization: { id: string; name: string; slug: string };
    adminUser: { email: string };
    tempPassword?: string;
  } | null>(null);

  const submit = async () => {
    setSaving(true);
    try {
      const data = await platformProspectService.convertToTenant(prospect.id, {
        planId,
        trialDurationDays,
        billingCycle,
      });
      setResult(data);
      toast.success('Trial tenant created successfully');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to convert');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Modal title="Trial Tenant Created" onClose={onSaved}>
        <div className="space-y-3 text-sm">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="font-medium text-green-900 mb-1">Success!</div>
            <p className="text-green-800">
              Organization <strong>{result.organization.name}</strong> created with subdomain{' '}
              <strong>{result.organization.slug}</strong>.
            </p>
          </div>
          <div>
            <strong>Tenant URL:</strong>{' '}
            <code className="bg-gray-100 px-2 py-0.5 rounded">
              https://{result.organization.slug}.myleadx.ai
            </code>
          </div>
          <div>
            <strong>Admin email:</strong> {result.adminUser.email}
          </div>
          {result.tempPassword ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-yellow-900 font-medium mb-1">Temporary password</div>
              <code className="bg-white px-2 py-1 rounded text-yellow-900 font-mono">
                {result.tempPassword}
              </code>
              <p className="text-xs text-yellow-700 mt-2">
                A welcome email has been sent. Share this password securely if email fails.
              </p>
            </div>
          ) : null}
        </div>
        <ModalActions saving={false} onCancel={onSaved} onSubmit={onSaved} submitLabel="Done" />
      </Modal>
    );
  }

  return (
    <Modal title="Convert to Trial Tenant" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          This creates a new organization for <strong>{prospect.companyName || prospect.fullName}</strong>,
          an admin user for <strong>{prospect.email}</strong>, and a trial subscription. A welcome email
          with login details will be sent to the prospect.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trial duration (days)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={trialDurationDays}
            onChange={(e) => setTrialDurationDays(parseInt(e.target.value, 10) || 14)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Billing cycle (post-trial)</label>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>
      <ModalActions
        saving={saving}
        onCancel={onClose}
        onSubmit={submit}
        submitLabel="Create trial tenant"
      />
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={saving}
        className="px-4 py-2 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
