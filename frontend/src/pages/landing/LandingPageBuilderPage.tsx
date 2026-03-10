import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  ArrowLeftIcon,
  PhotoIcon,
  DocumentTextIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Section {
  id: string;
  type: 'hero' | 'features' | 'testimonial' | 'cta' | 'form' | 'text' | 'image';
  content: Record<string, unknown>;
}

const sectionTypes = [
  { value: 'hero', label: 'Hero Section', icon: PhotoIcon },
  { value: 'features', label: 'Features', icon: RectangleGroupIcon },
  { value: 'text', label: 'Text Block', icon: DocumentTextIcon },
  { value: 'cta', label: 'Call to Action', icon: RectangleGroupIcon },
  { value: 'form', label: 'Contact Form', icon: DocumentTextIcon },
];

export default function LandingPageBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([
    {
      id: '1',
      type: 'hero',
      content: {
        headline: 'Welcome to Our Service',
        subheadline: 'Discover how we can help you succeed',
        buttonText: 'Get Started',
        backgroundImage: '',
      },
    },
  ]);

  // SEO Settings
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    try {
      const response = await api.get(`/landing-pages/${id}`);
      const page = response.data.data;
      setName(page.name);
      setSlug(page.slug);
      setTitle(page.title);
      setDescription(page.description || '');
      setSections(page.content?.sections || []);
      setMetaTitle(page.seoSettings?.metaTitle || '');
      setMetaDescription(page.seoSettings?.metaDescription || '');
    } catch (error) {
      toast.error('Failed to load landing page');
      navigate('/landing-pages');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a page name');
      return;
    }
    if (!slug.trim()) {
      toast.error('Please enter a URL slug');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a page title');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title,
        description,
        content: { sections },
        seoSettings: {
          metaTitle: metaTitle || title,
          metaDescription: metaDescription || description,
        },
      };

      if (isEditing) {
        await api.put(`/landing-pages/${id}`, payload);
        toast.success('Landing page updated');
      } else {
        await api.post('/landing-pages', payload);
        toast.success('Landing page created');
      }
      navigate('/landing-pages');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: Section['type']) => {
    const defaultContent: Record<string, unknown> = {};

    switch (type) {
      case 'hero':
        defaultContent.headline = 'New Hero Section';
        defaultContent.subheadline = 'Add your subheadline here';
        defaultContent.buttonText = 'Learn More';
        break;
      case 'features':
        defaultContent.title = 'Our Features';
        defaultContent.features = [
          { title: 'Feature 1', description: 'Description 1' },
          { title: 'Feature 2', description: 'Description 2' },
          { title: 'Feature 3', description: 'Description 3' },
        ];
        break;
      case 'text':
        defaultContent.content = 'Add your text content here...';
        break;
      case 'cta':
        defaultContent.headline = 'Ready to Get Started?';
        defaultContent.buttonText = 'Contact Us';
        break;
      case 'form':
        defaultContent.title = 'Contact Us';
        defaultContent.fields = ['name', 'email', 'phone', 'message'];
        break;
    }

    const newSection: Section = {
      id: Date.now().toString(),
      type,
      content: defaultContent,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, content: Record<string, unknown>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
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
        <div className="flex items-center">
          <button
            onClick={() => navigate('/landing-pages')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Landing Page' : 'Create Landing Page'}
            </h1>
            <p className="text-gray-600">Build your custom landing page.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary"
          >
            <EyeIcon className="h-5 w-5 mr-2" />
            Preview
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Page Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">Page Settings</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Page Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Summer Campaign"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">URL Slug</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      /p/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="summer-campaign"
                      className="input rounded-l-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Page Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Welcome to Our Summer Campaign"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this landing page"
                  rows={2}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Page Sections */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">Page Sections</h2>
            </div>
            <div className="card-body space-y-4">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {section.type} Section
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Section Content Editor */}
                  {section.type === 'hero' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={(section.content.headline as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            headline: e.target.value,
                          })
                        }
                        placeholder="Headline"
                        className="input"
                      />
                      <input
                        type="text"
                        value={(section.content.subheadline as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            subheadline: e.target.value,
                          })
                        }
                        placeholder="Subheadline"
                        className="input"
                      />
                      <input
                        type="text"
                        value={(section.content.buttonText as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            buttonText: e.target.value,
                          })
                        }
                        placeholder="Button Text"
                        className="input"
                      />
                    </div>
                  )}

                  {section.type === 'text' && (
                    <textarea
                      value={(section.content.content as string) || ''}
                      onChange={(e) =>
                        updateSection(section.id, {
                          ...section.content,
                          content: e.target.value,
                        })
                      }
                      placeholder="Enter your text content..."
                      rows={4}
                      className="input"
                    />
                  )}

                  {section.type === 'cta' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={(section.content.headline as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            headline: e.target.value,
                          })
                        }
                        placeholder="CTA Headline"
                        className="input"
                      />
                      <input
                        type="text"
                        value={(section.content.buttonText as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            buttonText: e.target.value,
                          })
                        }
                        placeholder="Button Text"
                        className="input"
                      />
                    </div>
                  )}

                  {section.type === 'form' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={(section.content.title as string) || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            ...section.content,
                            title: e.target.value,
                          })
                        }
                        placeholder="Form Title"
                        className="input"
                      />
                      <p className="text-sm text-gray-500">
                        Form will include: Name, Email, Phone, Message fields
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-3">Add a section:</p>
                <div className="flex flex-wrap gap-2">
                  {sectionTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => addSection(type.value as Section['type'])}
                      className="btn btn-secondary btn-sm"
                    >
                      <type.icon className="h-4 w-4 mr-1" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">SEO Settings</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Page title for search engines"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Description for search engines"
                  rows={3}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium">Preview</h2>
              </div>
              <div className="card-body">
                <div className="border rounded-lg overflow-hidden bg-white">
                  {sections.map((section) => (
                    <div key={section.id} className="p-4 border-b last:border-b-0">
                      {section.type === 'hero' && (
                        <div className="text-center py-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded">
                          <h2 className="text-xl font-bold">
                            {(section.content.headline as string) || 'Headline'}
                          </h2>
                          <p className="mt-2 text-sm opacity-90">
                            {(section.content.subheadline as string) || 'Subheadline'}
                          </p>
                          <button className="mt-4 px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium">
                            {(section.content.buttonText as string) || 'Button'}
                          </button>
                        </div>
                      )}
                      {section.type === 'text' && (
                        <p className="text-sm text-gray-700">
                          {(section.content.content as string) || 'Text content...'}
                        </p>
                      )}
                      {section.type === 'cta' && (
                        <div className="text-center py-6 bg-gray-100 rounded">
                          <h3 className="font-medium">
                            {(section.content.headline as string) || 'CTA Headline'}
                          </h3>
                          <button className="mt-3 btn btn-primary btn-sm">
                            {(section.content.buttonText as string) || 'Button'}
                          </button>
                        </div>
                      )}
                      {section.type === 'form' && (
                        <div className="p-4 bg-gray-50 rounded">
                          <h4 className="font-medium mb-3">
                            {(section.content.title as string) || 'Contact Form'}
                          </h4>
                          <div className="space-y-2">
                            <div className="h-8 bg-white border rounded"></div>
                            <div className="h-8 bg-white border rounded"></div>
                            <div className="h-8 bg-white border rounded"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
