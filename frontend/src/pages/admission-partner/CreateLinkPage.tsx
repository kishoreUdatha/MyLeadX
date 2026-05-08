import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ShareIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface University {
  id: string;
  name: string;
}

interface College {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

interface CreatedLink {
  id: string;
  linkCode: string;
  fullUrl: string;
  expiresAt: string;
}

export const AdmissionPartnerCreateLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);

  const [formData, setFormData] = useState({
    universityId: '',
    collegeId: '',
    courseId: '',
    studentName: '',
    studentPhone: '',
    studentEmail: '',
    expiresInHours: 72,
  });

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (formData.universityId) {
      fetchColleges(formData.universityId);
    } else {
      setColleges([]);
    }
  }, [formData.universityId]);

  useEffect(() => {
    if (formData.collegeId) {
      fetchCourses(formData.collegeId);
    } else if (formData.universityId) {
      fetchCourses(formData.universityId);
    } else {
      setCourses([]);
    }
  }, [formData.collegeId, formData.universityId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admission_partner_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUniversities = async () => {
    try {
      const response = await fetch('/api/partner-portal/universities', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUniversities(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  };

  const fetchColleges = async (universityId: string) => {
    try {
      const response = await fetch(`/api/partner-portal/universities/${universityId}/colleges`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setColleges(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    }
  };

  const fetchCourses = async (entityId: string) => {
    try {
      const endpoint = formData.collegeId
        ? `/api/partner-portal/colleges/${entityId}/courses`
        : `/api/partner-portal/universities/${entityId}/courses`;
      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.universityId) {
      toast.error('Please select a university');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/partner-portal/application-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create link');
      }

      setCreatedLink(data.data);
      toast.success('Application link created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(createdLink.fullUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareLink = async () => {
    if (!createdLink) return;

    const shareText = formData.studentName
      ? `Hi ${formData.studentName}, please fill your admission application using this link:`
      : 'Please fill your admission application using this link:';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Admission Application',
          text: shareText,
          url: createdLink.fullUrl,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: open WhatsApp
      const whatsappUrl = `https://wa.me/${formData.studentPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(`${shareText}\n${createdLink.fullUrl}`)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const createNewLink = () => {
    setCreatedLink(null);
    setFormData({
      universityId: '',
      collegeId: '',
      courseId: '',
      studentName: '',
      studentPhone: '',
      studentEmail: '',
      expiresInHours: 72,
    });
  };

  // Show success state with link
  if (createdLink) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Created!</h2>
          <p className="text-gray-600 mb-6">
            Share this link with the student to fill their application
          </p>

          {/* Link Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Application Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdLink.fullUrl}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Link Code: {createdLink.linkCode} | Expires: {new Date(createdLink.expiresAt).toLocaleDateString()}
            </p>
          </div>

          {/* Quick Share Options */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
              Copy Link
            </button>

            <button
              onClick={shareLink}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"
            >
              <ShareIcon className="h-5 w-5" />
              Share via WhatsApp
            </button>
          </div>

          {formData.studentName && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800">
                <strong>Student:</strong> {formData.studentName}
                {formData.studentPhone && ` | ${formData.studentPhone}`}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={createNewLink}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Another Link
            </button>
            <button
              onClick={() => navigate('/admission-partner/links')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              View All Links
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admission-partner')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Application Link</h1>
          <p className="text-gray-600">Generate a link for students to fill their own application</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <LinkIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">How it works</h3>
            <p className="text-sm text-blue-700 mt-1">
              Create a unique link and share it with the student via WhatsApp or SMS.
              The student fills their own details, and you get commission when they're admitted.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Link Settings</h2>

        {/* Course Pre-selection (Optional) */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              University <span className="text-red-500">*</span>
            </label>
            <select
              name="universityId"
              value={formData.universityId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select University</option>
              {universities.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Pre-select university for faster application</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <select
                name="collegeId"
                value={formData.collegeId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!formData.universityId || colleges.length === 0}
              >
                <option value="">Any College</option>
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={!formData.universityId || courses.length === 0}
              >
                <option value="">Any Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Student Pre-fill (Optional) */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Pre-fill Student Details (Optional)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            If you know the student's details, pre-fill them to make it easier for them.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Student's full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="studentPhone"
                value={formData.studentPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="10-digit mobile"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="studentEmail"
                value={formData.studentEmail}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="student@example.com"
              />
            </div>
          </div>
        </div>

        {/* Link Expiry */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Link Validity</label>
          <select
            name="expiresInHours"
            value={formData.expiresInHours}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={24}>24 hours</option>
            <option value={72}>3 days (Recommended)</option>
            <option value={168}>7 days</option>
            <option value={720}>30 days</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admission-partner')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <LinkIcon className="h-5 w-5" />
                Generate Link
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdmissionPartnerCreateLinkPage;
