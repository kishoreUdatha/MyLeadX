import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Users,
  Settings,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Database,
  CheckSquare,
  Square,
  Phone,
  PhoneCall,
  Zap,
  MousePointer,
  Cpu,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
}

interface Contact {
  phone: string;
  name: string;
  email: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  source?: string;
  createdAt: string;
}

const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Care',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-Commerce',
  CUSTOM: 'Custom',
};

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Contact source: 'manual', 'csv', or 'leads'
  const [contactSource, setContactSource] = useState<'manual' | 'csv' | 'leads'>('leads');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [leadFilter, setLeadFilter] = useState({
    source: searchParams.get('source') || '',
    search: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agentId: '',
    callingMode: 'MANUAL' as 'AUTOMATIC' | 'MANUAL',
    maxConcurrentCalls: 1,
    callsBetweenHours: { start: 9, end: 18 },
    retryAttempts: 2,
    retryDelayMinutes: 30,
    scheduledAt: '',
  });

  const [contacts, setContacts] = useState<Contact[]>([
    { phone: '', name: '', email: '' },
  ]);

  useEffect(() => {
    fetchAgents();
    fetchLeads();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        setAgents(response.data.data.filter((a: VoiceAgent) => a.isActive));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const params = new URLSearchParams();
      params.append('limit', '500'); // Get up to 500 leads
      if (leadFilter.source) params.append('source', leadFilter.source);
      if (leadFilter.search) params.append('search', leadFilter.search);

      const response = await api.get(`/leads?${params.toString()}`);
      if (response.data.success) {
        // Filter leads that have phone numbers
        const leadsWithPhone = response.data.data.filter((lead: Lead) => lead.phone);
        setLeads(leadsWithPhone);
      }
    } catch (err: any) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [leadFilter.source]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
    }
    setSelectAll(!selectAll);
  };

  const getContactsFromLeads = (): Contact[] => {
    return leads
      .filter(lead => selectedLeadIds.includes(lead.id))
      .map(lead => ({
        phone: lead.phone,
        name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        email: lead.email || '',
      }));
  };

  const addContact = () => {
    setContacts([...contacts, { phone: '', name: '', email: '' }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let newContacts: Contact[] = [];

        if (isExcel) {
          // Parse Excel file
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

          // Get header row to find column indices
          const headers = (jsonData[0] as any[] || []).map((h: any) => String(h || '').toLowerCase().trim());

          // Find phone and name column indices
          let phoneColIndex = headers.findIndex((h: string) =>
            h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('number')
          );
          let nameColIndex = headers.findIndex((h: string) =>
            h.includes('name') || h.includes('customer') || h.includes('lead')
          );

          // If no header match, try to detect from data
          if (phoneColIndex === -1) phoneColIndex = 0; // Default to first column
          if (nameColIndex === -1) nameColIndex = 1; // Default to second column

          // Skip header row (first row)
          const rows = jsonData.slice(1);

          newContacts = rows
            .filter((row: any[]) => row && row.length > 0)
            .map((row: any[]) => {
              let phone = '';
              let name = '';

              // Get phone from detected column
              if (row[phoneColIndex]) {
                phone = String(row[phoneColIndex]).trim();
              }

              // Get name from detected column
              if (row[nameColIndex] !== undefined && nameColIndex !== phoneColIndex) {
                name = String(row[nameColIndex] || '').trim();
              }

              // If phone column doesn't look like a phone, scan all columns
              if (!phone || phone.length < 10) {
                for (let i = 0; i < row.length; i++) {
                  const cell = String(row[i] || '').trim();
                  const cleanCell = cell.replace(/[\s\-()]/g, '');

                  // Phone detection: starts with + or has 10+ digits
                  if (cell.startsWith('+') || /^\d{10,}$/.test(cleanCell)) {
                    phone = cell;
                    break;
                  }
                }
              }

              // If no name found, look for text that's not phone/number
              if (!name) {
                for (let i = 0; i < row.length; i++) {
                  if (i === phoneColIndex) continue;
                  const cell = String(row[i] || '').trim();
                  // Name: contains letters, not just numbers, not email
                  if (cell && /[a-zA-Z]/.test(cell) && !cell.includes('@') && !/^\d+$/.test(cell.replace(/[\s\-()]/g, ''))) {
                    name = cell;
                    break;
                  }
                }
              }

              return { phone, name: name || '', email: '' };
            })
            .filter((c) => {
              const cleanPhone = c.phone.replace(/[\s\-()]/g, '');
              return cleanPhone.length >= 10;
            });

        } else {
          // Parse CSV file
          const text = event.target?.result as string;
          const lines = text.split('\n');

          // Check first line for headers
          const firstLine = lines[0]?.toLowerCase() || '';
          const hasHeader = firstLine.includes('phone') || firstLine.includes('name') || firstLine.includes('mobile');

          const dataLines = hasHeader ? lines.slice(1) : lines;

          newContacts = dataLines
            .filter((line) => line.trim())
            .map((line) => {
              const parts = line.split(',').map((s) => s.trim());
              // First column: phone, Second column: name
              return { phone: parts[0] || '', name: parts[1] || '', email: '' };
            })
            .filter((c) => {
              const cleanPhone = c.phone.replace(/[\s\-()]/g, '');
              return cleanPhone.length >= 10;
            });
        }

        if (newContacts.length > 0) {
          setContacts(newContacts);
          setError(null);
        } else {
          setError('No valid contacts found. Make sure file has phone numbers (10+ digits).');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        setError('Failed to parse file. Please check the format and try again.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };

    // Read as ArrayBuffer for Excel, Text for CSV
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const validateStep1 = () => {
    if (!formData.name) {
      setError('Campaign name is required');
      return false;
    }
    if (!formData.agentId) {
      setError('Please select an AI agent');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (contactSource === 'leads') {
      if (selectedLeadIds.length === 0) {
        setError('Please select at least one lead');
        return false;
      }
      setError(null);
      return true;
    }

    const validContacts = contacts.filter((c) => c.phone.trim());
    if (validContacts.length === 0) {
      setError('Please add at least one contact with a phone number');
      return false;
    }

    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    for (const contact of validContacts) {
      const cleanPhone = contact.phone.replace(/[\s-()]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        setError(`Invalid phone number: ${contact.phone}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    let validContacts: { phone: string; name?: string; email?: string; leadId?: string }[];

    if (contactSource === 'leads') {
      validContacts = leads
        .filter(lead => selectedLeadIds.includes(lead.id))
        .map(lead => ({
          phone: lead.phone.replace(/[\s-()]/g, ''),
          name: `${lead.firstName} ${lead.lastName || ''}`.trim() || undefined,
          email: lead.email || undefined,
          leadId: lead.id,
        }));
    } else {
      validContacts = contacts
        .filter((c) => c.phone.trim())
        .map((c) => ({
          phone: c.phone.replace(/[\s-()]/g, ''),
          name: c.name || undefined,
          email: c.email || undefined,
        }));
    }

    try {
      setSubmitting(true);
      const response = await api.post('/outbound-calls/campaigns', {
        agentId: formData.agentId,
        name: formData.name,
        description: formData.description || undefined,
        contacts: validContacts,
        callingMode: formData.callingMode,
        settings: {
          maxConcurrentCalls: formData.callingMode === 'MANUAL' ? 1 : formData.maxConcurrentCalls,
          callsBetweenHours: formData.callsBetweenHours,
          retryAttempts: formData.retryAttempts,
          retryDelayMinutes: formData.retryDelayMinutes,
        },
        scheduledAt: formData.scheduledAt || undefined,
      });

      if (response.data.success) {
        navigate('/outbound-calls');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/outbound-calls')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Call Campaign</h1>
          <p className="text-gray-600">
            Set up an automated AI calling campaign
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Settings size={20} />
            Campaign Details
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., January Lead Follow-up"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this campaign..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bot className="inline mr-2" size={16} />
                Select AI Agent *
              </label>
              {agents.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600 mb-2">No active voice agents found</p>
                  <button
                    type="button"
                    onClick={() => navigate('/voice-ai/create')}
                    className="text-blue-600 hover:underline"
                  >
                    Create a Voice Agent first
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${
                        formData.agentId === agent.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agentId"
                        value={agent.id}
                        checked={formData.agentId === agent.id}
                        onChange={(e) =>
                          setFormData({ ...formData, agentId: e.target.value })
                        }
                        className="hidden"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.agentId === agent.id
                            ? 'border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {formData.agentId === agent.id && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-500">
                          {industryLabels[agent.industry] || agent.industry}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => validateStep1() && setStep(2)}
                disabled={agents.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Next: Add Contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Contacts */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Users size={20} />
            Add Contacts
          </h2>

          {/* Contact Source Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setContactSource('leads')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                contactSource === 'leads'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database size={18} />
              Select from Leads
            </button>
            <button
              onClick={() => setContactSource('csv')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                contactSource === 'csv'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload size={18} />
              Upload File
            </button>
            <button
              onClick={() => setContactSource('manual')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                contactSource === 'manual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus size={18} />
              Manual Entry
            </button>
          </div>

          {/* Select from Leads */}
          {contactSource === 'leads' && (
            <div>
              {/* Filter */}
              <div className="flex gap-4 mb-4">
                <select
                  value={leadFilter.source}
                  onChange={(e) => setLeadFilter({ ...leadFilter, source: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Sources</option>
                  <option value="BULK_UPLOAD">Bulk Upload</option>
                  <option value="MANUAL">Manual Entry</option>
                  <option value="CHATBOT">Chatbot</option>
                  <option value="WEBSITE">Website</option>
                </select>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={leadFilter.search}
                  onChange={(e) => setLeadFilter({ ...leadFilter, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={fetchLeads}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Search
                </button>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button onClick={handleSelectAll} className="text-gray-600">
                    {selectAll ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                  </button>
                  <span className="font-medium">Select All ({leads.length} leads)</span>
                </label>
                <span className="text-blue-600 font-medium">
                  {selectedLeadIds.length} selected
                </span>
              </div>

              {/* Leads List */}
              {loadingLeads ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  <p className="text-gray-500 mt-2">Loading leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto mb-2 text-gray-300" size={48} />
                  <p>No leads found with phone numbers</p>
                  <button
                    onClick={() => navigate('/leads/bulk-upload')}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    Upload leads first
                  </button>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  {leads.map((lead) => (
                    <label
                      key={lead.id}
                      className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                        selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <button
                        onClick={(e) => { e.preventDefault(); toggleLeadSelection(lead.id); }}
                        className="text-gray-600"
                      >
                        {selectedLeadIds.includes(lead.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {lead.firstName} {lead.lastName || ''}
                        </p>
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {lead.source || 'Unknown'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CSV Upload */}
          {contactSource === 'csv' && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-600 mb-2">Upload CSV or Excel file with contacts</p>
                <p className="text-sm text-gray-500 mb-4">
                  File should have: Phone Number, Name (columns can be in any order)
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Upload size={16} />
                  Choose File
                </label>
              </div>
              {contacts.filter(c => c.phone).length > 0 && (
                <div className="mt-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center mb-3">
                    <p className="text-green-700">
                      <strong>{contacts.filter(c => c.phone).length}</strong> contacts loaded from file
                    </p>
                  </div>
                  {/* Preview first 5 contacts */}
                  <div className="bg-white rounded-lg border">
                    <div className="px-3 py-2 border-b bg-gray-50 text-xs font-medium text-gray-600 grid grid-cols-2">
                      <span>Phone</span>
                      <span>Name</span>
                    </div>
                    {contacts.slice(0, 5).map((c, i) => (
                      <div key={i} className="px-3 py-2 border-b last:border-b-0 text-sm grid grid-cols-2">
                        <span className="text-gray-900">{c.phone}</span>
                        <span className="text-gray-600">{c.name || '-'}</span>
                      </div>
                    ))}
                    {contacts.length > 5 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">
                        ... and {contacts.length - 5} more contacts
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          {contactSource === 'manual' && (
            <>
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      placeholder="+919876543210"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      placeholder="Name (optional)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeContact(index)}
                      disabled={contacts.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addContact}
                className="mt-3 flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Plus size={16} />
                Add Another Contact
              </button>
            </>
          )}

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>
                {contactSource === 'leads'
                  ? selectedLeadIds.length
                  : contacts.filter((c) => c.phone.trim()).length}
              </strong>{' '}
              contacts will be added to this campaign
            </p>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => validateStep2() && setStep(3)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next: Settings
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Settings & Launch */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Settings size={20} />
            Campaign Settings
          </h2>

          {/* Calling Mode Selection - Manual vs Automatic */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Settings className="inline mr-2" size={16} />
              Trigger Mode - Who initiates the calls?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manual Mode */}
              <label
                className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                  formData.callingMode === 'MANUAL'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="callingMode"
                  checked={formData.callingMode === 'MANUAL'}
                  onChange={() => setFormData({ ...formData, callingMode: 'MANUAL' })}
                  className="hidden"
                />
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${formData.callingMode === 'MANUAL' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <MousePointer size={20} className={formData.callingMode === 'MANUAL' ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Manual Queue</p>
                    <p className="text-xs text-green-600 font-medium">Recommended</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  User clicks "Call" for each contact. See lead details before calling, skip or schedule as needed.
                </div>
                <div className="text-xs text-gray-500">
                  Best for: Quality calls, personalized outreach
                </div>
                {formData.callingMode === 'MANUAL' && (
                  <div className="absolute top-2 right-2">
                    <CheckSquare size={20} className="text-green-600" />
                  </div>
                )}
              </label>

              {/* Automatic Mode */}
              <label
                className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                  formData.callingMode === 'AUTOMATIC'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="callingMode"
                  checked={formData.callingMode === 'AUTOMATIC'}
                  onChange={() => setFormData({ ...formData, callingMode: 'AUTOMATIC' })}
                  className="hidden"
                />
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${formData.callingMode === 'AUTOMATIC' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Cpu size={20} className={formData.callingMode === 'AUTOMATIC' ? 'text-blue-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Automatic Dialing</p>
                    <p className="text-xs text-gray-500">System auto-dials</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  System automatically calls all contacts one after another without user intervention.
                </div>
                <div className="text-xs text-gray-500">
                  Best for: High-volume campaigns, speed
                </div>
                {formData.callingMode === 'AUTOMATIC' && (
                  <div className="absolute top-2 right-2">
                    <CheckSquare size={20} className="text-blue-600" />
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Only show sequential/parallel options for AUTOMATIC mode */}
          {formData.callingMode === 'AUTOMATIC' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <PhoneCall className="inline mr-2" size={16} />
                Calling Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sequential Option */}
                <label
                  className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.maxConcurrentCalls === 1
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="concurrentMode"
                    checked={formData.maxConcurrentCalls === 1}
                    onChange={() => setFormData({ ...formData, maxConcurrentCalls: 1 })}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${formData.maxConcurrentCalls === 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Phone size={20} className={formData.maxConcurrentCalls === 1 ? 'text-blue-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Sequential</p>
                      <p className="text-xs text-gray-500">One at a time</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Calls contacts one by one
                  </div>
                  {formData.maxConcurrentCalls === 1 && (
                    <div className="absolute top-2 right-2">
                      <CheckSquare size={20} className="text-blue-600" />
                    </div>
                  )}
                </label>

                {/* Parallel Option */}
                <label
                  className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.maxConcurrentCalls > 1
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="concurrentMode"
                    checked={formData.maxConcurrentCalls > 1}
                    onChange={() => setFormData({ ...formData, maxConcurrentCalls: 5 })}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${formData.maxConcurrentCalls > 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Zap size={20} className={formData.maxConcurrentCalls > 1 ? 'text-blue-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Parallel</p>
                      <p className="text-xs text-gray-500">Multiple at once</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Multiple simultaneous calls
                  </div>
                  {formData.maxConcurrentCalls > 1 && (
                    <div className="absolute top-2 right-2">
                      <CheckSquare size={20} className="text-blue-600" />
                    </div>
                  )}
                </label>
              </div>

              {/* Concurrent calls slider - only show when parallel is selected */}
              {formData.maxConcurrentCalls > 1 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Concurrent calls: <span className="text-blue-600 font-bold">{formData.maxConcurrentCalls}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={formData.maxConcurrentCalls}
                    onChange={(e) => setFormData({ ...formData, maxConcurrentCalls: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline mr-2" size={16} />
                Calling Hours
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.callsBetweenHours.start}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      callsBetweenHours: {
                        ...formData.callsBetweenHours,
                        start: parseInt(e.target.value),
                      },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <span>to</span>
                <select
                  value={formData.callsBetweenHours.end}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      callsBetweenHours: {
                        ...formData.callsBetweenHours,
                        end: parseInt(e.target.value),
                      },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <PhoneCall className="inline mr-2" size={16} />
                Calling Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sequential Option */}
                <label
                  className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.maxConcurrentCalls === 1
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="callingMode"
                    checked={formData.maxConcurrentCalls === 1}
                    onChange={() => setFormData({ ...formData, maxConcurrentCalls: 1 })}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${formData.maxConcurrentCalls === 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Phone size={20} className={formData.maxConcurrentCalls === 1 ? 'text-blue-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Sequential Calling</p>
                      <p className="text-xs text-gray-500">One call at a time</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    AI calls each lead one by one. Waits for call to complete before dialing next number.
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">1</div>
                      <span className="text-gray-400">→</span>
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium">2</div>
                      <span className="text-gray-400">→</span>
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium">3</div>
                    </div>
                  </div>
                  {formData.maxConcurrentCalls === 1 && (
                    <div className="absolute top-2 right-2">
                      <CheckSquare size={20} className="text-blue-600" />
                    </div>
                  )}
                </label>

                {/* Parallel Option */}
                <label
                  className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.maxConcurrentCalls > 1
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="callingMode"
                    checked={formData.maxConcurrentCalls > 1}
                    onChange={() => setFormData({ ...formData, maxConcurrentCalls: 5 })}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${formData.maxConcurrentCalls > 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Zap size={20} className={formData.maxConcurrentCalls > 1 ? 'text-blue-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Parallel Calling</p>
                      <p className="text-xs text-gray-500">Multiple calls at once</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    AI makes multiple calls simultaneously for faster campaigns. Ideal for high-volume outreach.
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">1</div>
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">2</div>
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">3</div>
                      <span className="text-gray-500 ml-1">at same time</span>
                    </div>
                  </div>
                  {formData.maxConcurrentCalls > 1 && (
                    <div className="absolute top-2 right-2">
                      <CheckSquare size={20} className="text-blue-600" />
                    </div>
                  )}
                </label>
              </div>

              {/* Concurrent calls slider - only show when parallel is selected */}
              {formData.maxConcurrentCalls > 1 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Number of concurrent calls: <span className="text-blue-600 font-bold">{formData.maxConcurrentCalls}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={formData.maxConcurrentCalls}
                    onChange={(e) => setFormData({ ...formData, maxConcurrentCalls: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2 calls</span>
                    <span>10 calls</span>
                    <span>20 calls</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Note: Higher concurrent calls require more Exotel capacity and may incur additional costs.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Attempts
              </label>
              <select
                value={formData.retryAttempts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    retryAttempts: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[0, 1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} retr{n === 1 ? 'y' : 'ies'} for failed calls
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledAt: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to start manually
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Campaign Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Campaign Name</p>
                <p className="font-medium">{formData.name}</p>
              </div>
              <div>
                <p className="text-gray-500">AI Agent</p>
                <p className="font-medium">
                  {agents.find((a) => a.id === formData.agentId)?.name}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total Contacts</p>
                <p className="font-medium">
                  {contactSource === 'leads'
                    ? selectedLeadIds.length
                    : contacts.filter((c) => c.phone.trim()).length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Trigger Mode</p>
                <p className="font-medium flex items-center gap-1">
                  {formData.callingMode === 'MANUAL' ? (
                    <>
                      <MousePointer size={14} className="text-green-600" />
                      Manual Queue
                    </>
                  ) : (
                    <>
                      <Cpu size={14} className="text-blue-600" />
                      Auto {formData.maxConcurrentCalls > 1 ? `(${formData.maxConcurrentCalls}x)` : ''}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Calling Hours</p>
                <p className="font-medium">
                  {formData.callsBetweenHours.start}:00 -{' '}
                  {formData.callsBetweenHours.end}:00
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating...
                </>
              ) : (
                <>Create Campaign</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaignPage;
