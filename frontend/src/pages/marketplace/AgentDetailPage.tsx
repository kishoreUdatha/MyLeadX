import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  StarIcon as StarOutline,
  CpuChipIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  industry: string;
  category: string | null;
  tags: string[];
  priceType: string;
  oneTimePrice: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  screenshots: string[];
  demoVideoUrl: string | null;
  documentation: string | null;
  setupGuide: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  viewCount: number;
  installCount: number;
  averageRating: number | null;
  ratingCount: number;
  creatorType: string;
  version: string;
  publishedAt: string | null;
  reviews: Review[];
  _count: {
    reviews: number;
    licenses: number;
  };
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
}

export const AgentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<AgentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'docs'>('overview');

  useEffect(() => {
    if (slug) {
      fetchTemplate();
    }
  }, [slug]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketplace/templates/${slug}`);
      setTemplate(response.data.data);
    } catch (error) {
      toast.error('Failed to load agent details');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!template) return;

    try {
      setPurchasing(true);

      if (template.priceType === 'FREE') {
        // Direct purchase for free agents
        await api.post('/marketplace/purchase', {
          templateId: template.id,
        });
        toast.success('Agent added to your library!');
        navigate('/marketplace/my-agents');
      } else {
        // For paid agents, redirect to payment
        toast.error('Payment integration coming soon');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to get agent');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (template: AgentTemplate) => {
    if (template.priceType === 'FREE') return 'Free';
    if (template.priceType === 'ONE_TIME' && template.oneTimePrice) {
      return `₹${template.oneTimePrice.toLocaleString()}`;
    }
    if (template.monthlyPrice) {
      return `₹${template.monthlyPrice.toLocaleString()}/mo`;
    }
    return 'Free';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarSolid key={star} className="h-5 w-5 text-yellow-400" />
          ) : (
            <StarOutline key={star} className="h-5 w-5 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Marketplace
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-primary-600 to-purple-600 relative">
          {template.bannerUrl && (
            <img
              src={template.bannerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Agent Info */}
        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Icon */}
            <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center -mt-16 relative z-10">
              {template.iconUrl ? (
                <img src={template.iconUrl} alt="" className="w-16 h-16 rounded-lg" />
              ) : (
                <CpuChipIcon className="h-12 w-12 text-primary-600" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                {template.isVerified && (
                  <span className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    <CheckCircleIcon className="h-4 w-4" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">{template.shortDescription}</p>

              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  {template.averageRating && (
                    <>
                      {renderStars(Math.round(template.averageRating))}
                      <span className="text-sm text-gray-600">
                        {template.averageRating.toFixed(1)} ({template.ratingCount} reviews)
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {template.installCount} installs
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <EyeIcon className="h-4 w-4" />
                  {template.viewCount} views
                </div>
              </div>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {(template.tags as string[]).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Action */}
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-600">{formatPrice(template)}</p>
              {template.priceType === 'MONTHLY' && (
                <p className="text-sm text-gray-500">per month</p>
              )}
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="mt-4 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {purchasing
                  ? 'Processing...'
                  : template.priceType === 'FREE'
                  ? 'Get Free'
                  : 'Buy Now'}
              </button>
              {template.demoVideoUrl && (
                <button className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  <PlayIcon className="h-5 w-5" />
                  Watch Demo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'reviews', label: `Reviews (${template._count.reviews})` },
              { id: 'docs', label: 'Documentation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="prose max-w-none">
              <h2>About this Agent</h2>
              <p>{template.description}</p>

              <h3>Features</h3>
              <ul>
                <li>Industry: {template.industry}</li>
                <li>Category: {template.category || 'General'}</li>
                <li>Version: {template.version}</li>
                <li>Language: English</li>
              </ul>

              {template.setupGuide && (
                <>
                  <h3>Setup Guide</h3>
                  <p>{template.setupGuide}</p>
                </>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {template.reviews.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No reviews yet</p>
              ) : (
                template.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-6">
                    <div className="flex items-center gap-3">
                      {renderStars(review.rating)}
                      {review.isVerified && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h4 className="font-medium text-gray-900 mt-2">{review.title}</h4>
                    )}
                    {review.content && (
                      <p className="text-gray-600 mt-1">{review.content}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Documentation Tab */}
          {activeTab === 'docs' && (
            <div className="prose max-w-none">
              {template.documentation ? (
                <div dangerouslySetInnerHTML={{ __html: template.documentation }} />
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No documentation available
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetailPage;
