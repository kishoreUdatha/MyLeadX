/**
 * Lead Detail Modals - Extracted modal components
 */

import { useState } from 'react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalWrapper({ isOpen, title, children }: ModalWrapperProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: { title: string; description: string; dueDate: string; priority: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function TaskModal({ isOpen, onClose, onSubmit, counselors }: TaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Task">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="LOW">Low Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn btn-primary">Create Task</button>
      </div>
    </ModalWrapper>
  );
}

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (followUp: { scheduledAt: string; message: string; notes: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function FollowUpModal({ isOpen, onClose, onSubmit, counselors }: FollowUpModalProps) {
  const [form, setForm] = useState({
    scheduledAt: '',
    message: '',
    notes: '',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ scheduledAt: '', message: '', notes: '', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Schedule Follow-up">
      <div className="space-y-4">
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Message (optional)"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.scheduledAt} className="btn btn-primary">Schedule</button>
      </div>
    </ModalWrapper>
  );
}

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

export function QueryModal({ isOpen, onClose, onSubmit }: QueryModalProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    onSubmit(query);
    setQuery('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Query">
      <textarea
        placeholder="Enter query..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        rows={4}
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!query.trim()} className="btn btn-primary">Add Query</button>
      </div>
    </ModalWrapper>
  );
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (programName: string) => void;
}

export function ApplicationModal({ isOpen, onClose, onSubmit }: ApplicationModalProps) {
  const [programName, setProgramName] = useState('');

  const handleSubmit = () => {
    onSubmit(programName);
    setProgramName('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Application">
      <input
        type="text"
        placeholder="Program Name (optional)"
        value={programName}
        onChange={(e) => setProgramName(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} className="btn btn-primary">Create Application</button>
      </div>
    </ModalWrapper>
  );
}

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (interest: { name: string; category: string; notes: string }) => void;
}

export function InterestModal({ isOpen, onClose, onSubmit }: InterestModalProps) {
  const [form, setForm] = useState({ name: '', category: '', notes: '' });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ name: '', category: '', notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Interest">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Interest name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.name.trim()} className="btn btn-primary">Add Interest</button>
      </div>
    </ModalWrapper>
  );
}

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (callLog: { phoneNumber: string; direction: string; status: string; duration: number; notes: string }) => void;
  defaultPhone?: string;
}

export function CallLogModal({ isOpen, onClose, onSubmit, defaultPhone = '' }: CallLogModalProps) {
  const [form, setForm] = useState({
    phoneNumber: defaultPhone,
    direction: 'OUTBOUND',
    status: 'COMPLETED',
    duration: 0,
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ phoneNumber: defaultPhone, direction: 'OUTBOUND', status: 'COMPLETED', duration: 0, notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Log Call">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Phone number"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.direction}
          onChange={(e) => setForm({ ...form, direction: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="COMPLETED">Completed</option>
          <option value="MISSED">Missed</option>
          <option value="NO_ANSWER">No Answer</option>
          <option value="BUSY">Busy</option>
        </select>
        <input
          type="number"
          placeholder="Duration (seconds)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.phoneNumber} className="btn btn-primary">Log Call</button>
      </div>
    </ModalWrapper>
  );
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string; mediaUrl: string }) => void;
  phone: string;
}

export function WhatsAppModal({ isOpen, onClose, onSubmit, phone }: WhatsAppModalProps) {
  const [form, setForm] = useState({ message: '', mediaUrl: '' });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ message: '', mediaUrl: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Send WhatsApp Message">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">To: {phone}</p>
        </div>
        <textarea
          placeholder="Type your message..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={4}
        />
        <input
          type="url"
          placeholder="Media URL (optional)"
          value={form.mediaUrl}
          onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.message.trim()} className="btn btn-primary">Send WhatsApp</button>
      </div>
    </ModalWrapper>
  );
}

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  phone: string;
}

export function SmsModal({ isOpen, onClose, onSubmit, phone }: SmsModalProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    onSubmit(message);
    setMessage('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Send SMS">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">To: {phone}</p>
        </div>
        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={4}
        />
        <p className="text-xs text-slate-400">Character count: {message.length}/160</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!message.trim()} className="btn btn-primary">Send SMS</button>
      </div>
    </ModalWrapper>
  );
}
