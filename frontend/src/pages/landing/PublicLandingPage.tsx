/**
 * Public Landing Page Renderer
 *
 * Renders a landing page built in the CRM at the public URL /p/:slug.
 * Resolves the org from the current subdomain (e.g. smartgrow-info-tech.myleadx.ai
 * → org slug "smartgrow-info-tech"), fetches the published page, and renders
 * its sections (Hero, Features, CTA, Form, Text).
 *
 * Form submissions create a PlatformProspect with UTM attribution captured
 * from the URL query string.
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ProspectSource } from '../../services/platform-prospect.service';

interface Section {
  id: string;
  type: 'hero' | 'features' | 'cta' | 'form' | 'text' | 'image' | 'testimonial';
  content: Record<string, unknown>;
}

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  content: { sections: Section[] };
  seoSettings?: { metaTitle?: string; metaDescription?: string };
}

function extractOrgSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  // localhost / 127.0.0.1 → return null (caller will fall back to a default for dev)
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split('.');
  // smartgrow-info-tech.myleadx.ai → ["smartgrow-info-tech", "myleadx", "ai"]
  if (parts.length >= 3) return parts[0];
  return null;
}

function inferSource(utmSource: string | null, utmMedium: string | null): ProspectSource {
  if (!utmSource) return 'ORGANIC';
  const s = utmSource.toLowerCase();
  if (s.includes('facebook') || s.includes('instagram') || s === 'meta') return 'META_LANDING_PAGE';
  if (s.includes('google')) return 'GOOGLE_ADS_LANDING';
  if (s.includes('linkedin')) return 'LINKEDIN_LEAD_GEN';
  if (s.includes('tiktok')) return 'TIKTOK_LEAD_GEN';
  if (s.includes('twitter') || s === 'x') return 'TWITTER_LEAD_GEN';
  if (s.includes('youtube')) return 'YOUTUBE_LEAD_GEN';
  if (s.includes('email')) return 'EMAIL_CAMPAIGN';
  if (utmMedium && utmMedium.toLowerCase().includes('referral')) return 'REFERRAL';
  return 'DIRECT';
}

export default function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orgSlug = extractOrgSlugFromHost() || import.meta.env.VITE_DEFAULT_ORG_SLUG || 'smartgrow-info-tech';
    api
      .get(`/landing-pages/public/${orgSlug}/${slug}`)
      .then((response) => {
        setPage(response.data.data);
        const seo = response.data.data.seoSettings;
        if (seo?.metaTitle) document.title = seo.metaTitle;
        if (seo?.metaDescription) {
          let meta = document.querySelector('meta[name="description"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', seo.metaDescription);
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Landing page not found';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">{error || 'The landing page you are looking for does not exist or is not published yet.'}</p>
        </div>
      </div>
    );
  }

  const sections = page.content?.sections || [];

  const utmParams = {
    utmSource: searchParams.get('utm_source') || undefined,
    utmMedium: searchParams.get('utm_medium') || undefined,
    utmCampaign: searchParams.get('utm_campaign') || undefined,
    utmContent: searchParams.get('utm_content') || undefined,
    utmTerm: searchParams.get('utm_term') || undefined,
    adId: searchParams.get('ad_id') || undefined,
    adName: searchParams.get('ad_name') || undefined,
  };
  const source = inferSource(utmParams.utmSource ?? null, utmParams.utmMedium ?? null);

  const scrollToForm = () => {
    const formEl = document.getElementById('landing-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          onCtaClick={scrollToForm}
          source={source}
          utm={utmParams}
          landingPageId={page.id}
        />
      ))}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} MyLeadX. Operated by SMARTGROW INFOTECH PRIVATE LIMITED.</p>
      </footer>
    </div>
  );
}

interface SectionRendererProps {
  section: Section;
  onCtaClick: () => void;
  source: ProspectSource;
  utm: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    adId?: string;
    adName?: string;
  };
  landingPageId: string;
}

function SectionRenderer({ section, onCtaClick, source, utm, landingPageId }: SectionRendererProps) {
  const c = section.content;

  if (section.type === 'hero') {
    return (
      <section className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{(c.headline as string) || ''}</h1>
          <p className="text-xl md:text-2xl text-cyan-50 mb-8">{(c.subheadline as string) || ''}</p>
          {c.buttonText ? (
            <button
              onClick={onCtaClick}
              className="bg-white text-cyan-700 px-8 py-4 rounded-lg font-semibold hover:bg-cyan-50 transition-colors text-lg"
            >
              {c.buttonText as string}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.type === 'features') {
    const features = (c.features as Array<{ title: string; description: string }>) || [];
    return (
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {c.title ? (
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              {c.title as string}
            </h2>
          ) : null}
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === 'cta') {
    return (
      <section className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{(c.headline as string) || ''}</h2>
          {c.buttonText ? (
            <button
              onClick={onCtaClick}
              className="bg-cyan-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-cyan-600 transition-colors text-lg"
            >
              {c.buttonText as string}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (section.type === 'text') {
    return (
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <p className="text-gray-700 whitespace-pre-wrap">{(c.content as string) || ''}</p>
        </div>
      </section>
    );
  }

  if (section.type === 'form') {
    return (
      <ProspectFormSection
        content={c}
        source={source}
        utm={utm}
        landingPageId={landingPageId}
      />
    );
  }

  return null;
}

interface FormFieldConfig {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

function normalizeFields(rawFields: unknown): FormFieldConfig[] {
  if (!Array.isArray(rawFields)) return defaultFields();
  if (rawFields.length === 0) return defaultFields();

  if (typeof rawFields[0] === 'string') {
    return (rawFields as string[]).map((key) => {
      switch (key) {
        case 'name':
          return { id: 'fullName', label: 'Full Name', type: 'text', required: true, placeholder: 'Your name' };
        case 'email':
          return { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' };
        case 'phone':
          return { id: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 98765 43210' };
        case 'message':
          return { id: 'message', label: 'Message', type: 'textarea', required: false };
        default:
          return { id: key, label: key, type: 'text', required: false };
      }
    });
  }

  return rawFields as FormFieldConfig[];
}

function defaultFields(): FormFieldConfig[] {
  return [
    { id: 'fullName', label: 'Full Name', type: 'text', required: true, placeholder: 'Your name' },
    { id: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 98765 43210' },
    { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  ];
}

function ProspectFormSection({
  content,
  source,
  utm,
  landingPageId,
}: {
  content: Record<string, unknown>;
  source: ProspectSource;
  utm: SectionRendererProps['utm'];
  landingPageId: string;
}) {
  const fields = normalizeFields(content.fields);
  const title = (content.title as string) || 'Get Started';
  const submitText = (content.submitButtonText as string) || 'Submit';

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const fullName = values.fullName || values.name || '';
    const email = values.email || '';
    const phone = values.phone || '';

    if (!fullName || !email || !phone) {
      toast.error('Name, email, and phone are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/platform-prospects/public/submit', {
        fullName,
        email,
        phone,
        companyName: values.companyName,
        designation: values.designation,
        teamSize: values.teamSize,
        industry: values.industry,
        currentCrm: values.currentCrm,
        source,
        campaign: utm.utmCampaign,
        medium: utm.utmMedium,
        utmContent: utm.utmContent,
        utmTerm: utm.utmTerm,
        adId: utm.adId,
        adName: utm.adName,
        landingPageId,
        referrerUrl: typeof document !== 'undefined' ? document.referrer : undefined,
        rawData: values,
      });
      setSubmitted(true);
      toast.success("Thanks! We'll be in touch shortly.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="landing-form" className="py-20 px-6 bg-slate-50">
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-green-900 mb-2">Thank you!</h2>
            <p className="text-green-800">
              We've received your details and a member of our team will reach out shortly.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="landing-form" className="py-20 px-6 bg-slate-50">
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">{title}</h2>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required ? <span className="text-red-500 ml-1">*</span> : null}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={values[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-600 text-white py-3 rounded-lg font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : submitText}
          </button>
        </form>
      </div>
    </section>
  );
}

