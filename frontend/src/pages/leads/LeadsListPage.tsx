import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { fetchLeads, deleteLead } from '../../store/slices/leadSlice';
import { showToast } from '../../utils/toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  PhoneIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  NEW: { bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500' },
  CONTACTED: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  QUALIFIED: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
  NEGOTIATION: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  WON: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
  LOST: { bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500' },
  FOLLOW_UP: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
};

export default function LeadsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { leads, total, isLoading, page, limit } = useSelector(
    (state: RootState) => state.leads
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [assignedToId] = useState(searchParams.get('assignedToId') || '');

  const statusOptions = [
    { value: '', label: t('leads:filters.allStatuses') },
    { value: 'NEW', label: t('leads:status.NEW') },
    { value: 'CONTACTED', label: t('leads:status.CONTACTED') },
    { value: 'QUALIFIED', label: t('leads:status.QUALIFIED') },
    { value: 'NEGOTIATION', label: t('leads:status.NEGOTIATION') },
    { value: 'WON', label: t('leads:status.WON') },
    { value: 'LOST', label: t('leads:status.LOST') },
    { value: 'FOLLOW_UP', label: t('leads:status.FOLLOW_UP') },
  ];

  const sourceOptions = [
    { value: '', label: t('leads:filters.allSources') },
    { value: 'MANUAL', label: t('leads:source.MANUAL') },
    { value: 'BULK_UPLOAD', label: t('leads:source.BULK_UPLOAD') },
    { value: 'FORM', label: t('leads:source.FORM') },
    { value: 'LANDING_PAGE', label: t('leads:source.LANDING_PAGE') },
    { value: 'CHATBOT', label: t('leads:source.CHATBOT') },
    { value: 'AD_FACEBOOK', label: t('leads:source.AD_FACEBOOK') },
    { value: 'AD_INSTAGRAM', label: t('leads:source.AD_INSTAGRAM') },
    { value: 'AD_LINKEDIN', label: t('leads:source.AD_LINKEDIN') },
  ];

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (source) params.source = source;
    if (assignedToId) params.assignedToId = assignedToId;

    dispatch(
      fetchLeads({
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
        limit: 20,
      })
    );
  }, [dispatch, searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    if (assignedToId) params.set('assignedToId', assignedToId);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('leads:confirm.delete'))) {
      try {
        await dispatch(deleteLead(id)).unwrap();
        showToast.success('leads.deleted');
      } catch (error) {
        showToast.error('error.delete');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('leads:title')}</h1>
          <p className="text-slate-500 mt-1">
            {t('leads:subtitle')}
          </p>
        </div>
        <Link to="/leads/bulk-upload" className="btn btn-primary">
          <PlusIcon className="h-4 w-4" />
          {t('leads:addLeads')}
        </Link>
      </div>

      {/* Filters Card */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('leads:search.placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input pl-11"
                />
              </div>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button onClick={handleSearch} className="btn btn-primary">
              <FunnelIcon className="h-4 w-4" />
              {t('leads:filters.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('leads:table.lead')}</th>
                <th>{t('leads:table.contact')}</th>
                <th>{t('leads:table.source')}</th>
                <th>{t('leads:table.status')}</th>
                <th>{t('leads:table.assignedTo')}</th>
                <th>{t('leads:table.created')}</th>
                <th className="text-right">{t('leads:table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="spinner spinner-lg"></span>
                      <p className="text-slate-500">{t('leads:loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="empty-state">
                      <UserGroupIcon className="empty-state-icon" />
                      <p className="empty-state-title">{t('leads:empty.title')}</p>
                      <p className="empty-state-text">
                        {t('leads:empty.description')}
                      </p>
                      <Link to="/leads/bulk-upload" className="btn btn-primary mt-4">
                        <PlusIcon className="h-4 w-4" />
                        {t('leads:addLeads')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusStyle = statusColors[lead.status] || {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    dot: 'bg-slate-500',
                  };

                  return (
                    <tr key={lead.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {lead.firstName} {lead.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-900">{lead.phone}</p>
                          <p className="text-sm text-slate-500">{lead.email}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {(lead.source || 'Unknown').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                          {(lead.status || 'NEW').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {lead.assignments?.[0]?.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                              {lead.assignments[0].assignedTo.firstName?.[0]}
                              {lead.assignments[0].assignedTo.lastName?.[0]}
                            </div>
                            <span className="text-sm text-slate-700">
                              {lead.assignments[0].assignedTo.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">{t('leads:table.unassigned')}</span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-slate-500">
                          {new Date(lead.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title={t('leads:viewDetails')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-2 rounded-lg text-slate-500 hover:text-success-600 hover:bg-success-50 transition-colors"
                            title={t('leads:call')}
                          >
                            <PhoneIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                            title={t('common:delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="text-sm text-slate-600">
              {t('leads:pagination.showing')} <span className="font-medium">{(page - 1) * limit + 1}</span> {t('leads:pagination.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, total)}</span> {t('leads:pagination.of')}{' '}
              <span className="font-medium">{total}</span> {t('leads:pagination.leads')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page - 1));
                  setSearchParams(params);
                }}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                {t('common:previous')}
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('page', String(pageNum));
                        setSearchParams(params);
                      }}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page + 1));
                  setSearchParams(params);
                }}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
              >
                {t('common:next')}
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
