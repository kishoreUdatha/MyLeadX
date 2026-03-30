import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Campaign {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  content: string;
  subject?: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

const typeIcons = {
  SMS: ChatBubbleLeftRightIcon,
  EMAIL: EnvelopeIcon,
  WHATSAPP: PhoneIcon,
};

const typeColors = {
  SMS: 'bg-blue-100 text-blue-600',
  EMAIL: 'bg-green-100 text-green-600',
  WHATSAPP: 'bg-emerald-100 text-emerald-600',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignType, setCampaignType] = useState<'SMS' | 'EMAIL' | 'WHATSAPP'>('SMS');
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    subject: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
      setError('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.post('/campaigns', {
        name: formData.name,
        type: campaignType,
        content: formData.content,
        subject: campaignType === 'EMAIL' ? formData.subject : undefined,
      });

      setShowCreateModal(false);
      setFormData({ name: '', content: '', subject: '' });
      fetchCampaigns();
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = (type: 'SMS' | 'EMAIL' | 'WHATSAPP') => {
    setCampaignType(type);
    setFormData({ name: '', content: '', subject: '' });
    setShowCreateModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Create and manage SMS, Email, and WhatsApp campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCampaigns}
            className="btn btn-secondary"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openCreateModal('SMS')}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Campaign Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => openCreateModal('SMS')}
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">SMS Campaign</h3>
              <p className="text-sm text-gray-500">Send bulk text messages</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => openCreateModal('EMAIL')}
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Email Campaign</h3>
              <p className="text-sm text-gray-500">Send bulk emails</p>
            </div>
          </div>
        </button>

        <Link
          to="/whatsapp/bulk"
          className="card card-body text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <PhoneIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">WhatsApp Campaign</h3>
              <p className="text-sm text-gray-500">Send WhatsApp messages</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">All Campaigns</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Create your first campaign to get started</p>
            <button
              onClick={() => openCreateModal('SMS')}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Recipients</th>
                  <th>Delivered</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {campaigns.map((campaign) => {
                  const TypeIcon = typeIcons[campaign.type];
                  const deliveryRate = campaign.sentCount > 0
                    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
                    : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {campaign.content.substring(0, 50)}...
                        </div>
                      </td>
                      <td>
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[campaign.type]}`}>
                          <TypeIcon className="h-4 w-4 mr-1" />
                          {campaign.type}
                        </div>
                      </td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td>{campaign.recipientCount || 0}</td>
                      <td>
                        <div>
                          {campaign.deliveredCount || 0} / {campaign.sentCount || 0}
                        </div>
                        {campaign.sentCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {deliveryRate}% delivered
                          </div>
                        )}
                        {campaign.failedCount > 0 && (
                          <div className="text-xs text-red-500">
                            {campaign.failedCount} failed
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{new Date(campaign.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(campaign.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h2 className="text-lg font-medium mb-4">
                Create {campaignType} Campaign
              </h2>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="label">Campaign Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Welcome Message"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {campaignType === 'EMAIL' && (
                  <div>
                    <label className="label">Subject</label>
                    <input
                      type="text"
                      placeholder="Email subject line"
                      className="input"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="label">Message</label>
                  <textarea
                    rows={5}
                    placeholder="Enter your message..."
                    className="input"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{name}'} to personalize with recipient's name
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> After creating the campaign, you'll need to add recipients and then execute it.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
