import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ApplicationLink {
  id: string;
  token: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  studentName?: string;
  studentPhone?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  accessCount: number;
}

export const AdmissionPartnerLinksPage: React.FC = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ApplicationLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem('admission_partner_token');
      const response = await fetch('/api/partner-portal/application-links', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch links');

      const data = await response.json();
      setLinks(data.data || []);
    } catch (error) {
      toast.error('Failed to load application links');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircleIcon className="w-4 h-4" /> };
      case 'USED':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircleIcon className="w-4 h-4" /> };
      case 'EXPIRED':
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: <XCircleIcon className="w-4 h-4" /> };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: <ClockIcon className="w-4 h-4" /> };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Links</h1>
          <p className="text-gray-600">Create and share application links with students</p>
        </div>
        <button
          onClick={() => navigate('/admission-partner/links/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          Create Link
        </button>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12">
            <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No application links created yet</p>
            <button
              onClick={() => navigate('/admission-partner/links/new')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first link
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {links.map((link) => {
              const status = getStatusStyle(link.status);
              return (
                <div key={link.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <LinkIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {link.studentName || 'No student assigned'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {link.studentPhone || 'Link for any student'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.icon}
                        {link.status}
                      </span>

                      <span className="text-sm text-gray-500">
                        {link.accessCount} views
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyLink(link.token)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Copy Link"
                        >
                          <ClipboardDocumentIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionPartnerLinksPage;
