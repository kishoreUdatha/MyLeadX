import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await api.get('/landing-pages');
      setPages(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;

    try {
      await api.delete(`/landing-pages/${id}`);
      toast.success('Landing page deleted');
      fetchPages();
    } catch (error) {
      toast.error('Failed to delete landing page');
    }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      await api.post(`/landing-pages/${id}/${publish ? 'publish' : 'unpublish'}`);
      toast.success(publish ? 'Landing page published' : 'Landing page unpublished');
      fetchPages();
    } catch (error) {
      toast.error('Failed to update landing page');
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-600">Create and manage landing pages for lead capture.</p>
        </div>
        <Link to="/landing-pages/new" className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No landing pages yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first landing page to start capturing leads.
            </p>
            <Link to="/landing-pages/new" className="btn btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Page
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <div key={page.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{page.name}</h3>
                    <p className="text-sm text-gray-500">{page.title}</p>
                  </div>
                  <span
                    className={`badge ${
                      page.isPublished ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    {page.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    /{page.slug}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyUrl(page.slug)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Copy URL"
                    >
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    </button>
                    <Link
                      to={`/p/${page.slug}`}
                      target="_blank"
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Preview"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                    <Link
                      to={`/landing-pages/${page.id}/edit`}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="p-2 text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handlePublish(page.id, !page.isPublished)}
                    className={`btn btn-sm ${
                      page.isPublished ? 'btn-secondary' : 'btn-primary'
                    }`}
                  >
                    {page.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
