import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  Cog6ToothIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const EXAMPLE_PROMPTS = [
  { text: 'Find restaurants in Mumbai', icon: '🍽️' },
  { text: 'Get gyms and fitness centers in Bangalore', icon: '💪' },
  { text: 'Find real estate agents in Hyderabad', icon: '🏠' },
  { text: 'Scrape hotels in Goa', icon: '🏨' },
  { text: 'Find software companies in Pune', icon: '💻' },
  { text: 'Get wedding planners in Delhi', icon: '💒' },
  { text: 'Find dental clinics in Chennai', icon: '🦷' },
  { text: 'Get car dealers in Ahmedabad', icon: '🚗' },
];

interface ScrapeResult {
  searchQueries: string[];
  scraperType: string;
  scraperId?: string;
  jobId?: string;
  status?: string;
}

interface RecentJob {
  id: string;
  status: string;
  recordsScraped: number;
  createdAt: string;
  config?: { name: string };
}

export default function ApifySmartScrapePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [alsoFindEmails, setAlsoFindEmails] = useState(true); // Default to true

  // Integration state
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Stats
  const [stats, setStats] = useState<{
    totalLeadsScraped: number;
    totalJobs: number;
    recentJobs: RecentJob[];
  } | null>(null);

  useEffect(() => {
    checkIntegration();
  }, []);

  const checkIntegration = async () => {
    try {
      const [integrationRes, statsRes] = await Promise.all([
        api.get('/apify/integration'),
        api.get('/apify/stats').catch(() => ({ data: { data: null } })),
      ]);

      setIsConfigured(!!integrationRes.data.data);
      if (statsRes.data.data) {
        setStats(statsRes.data.data);
      }
    } catch {
      setIsConfigured(false);
    }
  };

  const handleSaveToken = async () => {
    if (!apiToken.trim()) {
      toast.error('Please enter your API token');
      return;
    }

    setIsTestingToken(true);
    try {
      const testRes = await api.post('/apify/test-connection', { apiToken });
      if (testRes.data.data?.user) {
        await api.post('/apify/integration', { apiToken });
        toast.success(`Connected as ${testRes.data.data.user.username}`);
        setIsConfigured(true);
        setShowSettings(false);
        setApiToken('');
        checkIntegration();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid API token');
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleSmartScrape = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to scrape');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await api.post('/apify/smart-scrape', {
        prompt,
        extractEmails: alsoFindEmails
      });
      setResult(response.data.data);

      if (alsoFindEmails) {
        toast.success('Scraping started! Emails will be extracted from websites automatically.');
      } else {
        toast.success('Scraping started! Results will appear in Raw Imports.');
      }
      checkIntegration(); // Refresh stats
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start scrape');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not configured - show simple setup
  if (!isConfigured && !showSettings) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Smart Scrape</h1>
          <p className="text-xs text-gray-500 mt-1">
            Scrape leads from Google Maps, LinkedIn, and more with AI
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">Connect Apify Account</span>
          </div>

          <p className="text-[10px] text-gray-500 mb-3">
            Get your API token from{' '}
            <a
              href="https://console.apify.com/account/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              Apify Console → Settings → API
            </a>
          </p>

          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="apify_api_..."
            className="w-full px-3 py-2 text-xs border rounded-lg mb-3"
          />

          <button
            onClick={handleSaveToken}
            disabled={isTestingToken || !apiToken.trim()}
            className="w-full py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isTestingToken ? (
              <>
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect & Start Scraping'
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-gray-400 mt-4">
          Free tier available • No credit card required
        </p>
      </div>
    );
  }

  // Main scraping interface
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-purple-600" />
            Smart Scrape
          </h1>
          <p className="text-[10px] text-gray-500">
            Describe what you want to find - AI handles the rest
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
        >
          <Cog6ToothIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">API Token</span>
            <span className="text-[10px] text-green-600">● Connected</span>
          </div>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Enter new token to update..."
            className="w-full px-2 py-1.5 text-xs border rounded mb-2"
          />
          <button
            onClick={handleSaveToken}
            disabled={isTestingToken || !apiToken.trim()}
            className="px-3 py-1 text-[10px] bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {isTestingToken ? 'Updating...' : 'Update Token'}
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {stats && (stats.totalLeadsScraped > 0 || stats.totalJobs > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border p-2.5 text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalLeadsScraped}</div>
            <div className="text-[10px] text-gray-500">Leads Scraped</div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalJobs}</div>
            <div className="text-[10px] text-gray-500">Total Jobs</div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.recentJobs?.length || 0}</div>
            <div className="text-[10px] text-gray-500">Recent</div>
          </div>
        </div>
      )}

      {/* Main Input */}
      <div className="bg-white rounded-lg border p-4 mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Find all restaurants in Mumbai with contact details and ratings"
          className="w-full px-3 py-2 text-sm border-0 focus:ring-0 resize-none placeholder-gray-400"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSmartScrape();
            }
          }}
        />

        <div className="flex items-center justify-between pt-2 border-t">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoFindEmails}
              onChange={(e) => setAlsoFindEmails(e.target.checked)}
              className="h-3 w-3 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <EnvelopeIcon className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] text-gray-600">Also find emails from websites</span>
          </label>
          <button
            onClick={handleSmartScrape}
            disabled={isProcessing || !prompt.trim()}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-3 w-3" />
                Scrape
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="mb-4">
        <div className="text-[10px] text-gray-500 mb-2">Try these:</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example.text)}
              className="px-2 py-1 text-[10px] bg-gray-100 text-gray-700 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors flex items-center gap-1"
            >
              <span>{example.icon}</span>
              <span>{example.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Scraping Started!</span>
          </div>

          <div className="text-xs text-green-700 space-y-1 mb-3">
            <div><span className="text-green-600">Source:</span> {result.scraperType.replace('_', ' ')}</div>
            <div><span className="text-green-600">Queries:</span> {result.searchQueries.join(', ')}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/apify-jobs')}
              className="px-3 py-1.5 text-[10px] font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 flex items-center gap-1"
            >
              <ClockIcon className="h-3 w-3" />
              View Progress
            </button>
            <button
              onClick={() => navigate('/raw-imports')}
              className="px-3 py-1.5 text-[10px] font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center gap-1"
            >
              <DocumentTextIcon className="h-3 w-3" />
              View Leads
            </button>
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      {stats?.recentJobs && stats.recentJobs.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Recent Scrapes</span>
            <button
              onClick={() => navigate('/apify-jobs')}
              className="text-[10px] text-purple-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {stats.recentJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="text-xs text-gray-700">{job.config?.name || 'Smart Scrape'}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{job.recordsScraped} leads</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    job.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' :
                    job.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                    job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
