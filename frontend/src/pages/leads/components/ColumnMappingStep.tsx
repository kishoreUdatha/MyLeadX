/**
 * Column Mapping Step Component
 * Compact professional design with searchable dropdown
 */
import { useState, useEffect, useRef } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { FilePreviewResult, ColumnMapping, SystemField } from '../../../services/lead.service';

// Searchable Select Component
interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { key: string; label: string; category?: string; required?: boolean }[];
  className?: string;
  placeholder?: string;
}

function SearchableSelect({ value, onChange, options, className = '', placeholder = 'Select...' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(o => o.key === value);
  const displayLabel = selectedOption?.label || placeholder;

  // Filter options based on search
  const filteredOptions = search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.category && o.category.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  // Group by category
  const groupedOptions: Record<string, typeof options> = {};
  filteredOptions.forEach(opt => {
    const cat = opt.category || 'Actions';
    if (!groupedOptions[cat]) groupedOptions[cat] = [];
    groupedOptions[cat].push(opt);
  });

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-[10px] rounded border px-1.5 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex items-center justify-between gap-0.5 ${className}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDownIcon className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-1.5 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-5 pr-5 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-40 overflow-y-auto">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-2 py-1.5 text-[10px] text-gray-500">No matches</div>
            ) : (
              Object.entries(groupedOptions).map(([category, opts]) => (
                <div key={category}>
                  <div className="px-1.5 py-0.5 text-[9px] font-semibold text-gray-400 uppercase bg-gray-50 sticky top-0">
                    {category}
                  </div>
                  {opts.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        onChange(opt.key);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full text-left px-2 py-1 text-[10px] hover:bg-blue-50 flex items-center justify-between ${
                        value === opt.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span>
                        {opt.label}
                        {opt.required && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                      {value === opt.key && <CheckIcon className="h-2.5 w-2.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ColumnMappingStepProps {
  preview: FilePreviewResult;
  onConfirm: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
  isLoading: boolean;
  industry?: string;
}

// Industry to category mapping - shows relevant categories first
const INDUSTRY_CATEGORIES: Record<string, string[]> = {
  EDUCATION: ['Basic Info', 'Family Info', 'Education', 'Address', 'Preferences', 'Lead Info'],
  HEALTHCARE: ['Basic Info', 'Healthcare', 'Address', 'Family Info', 'Lead Info', 'Preferences'],
  REAL_ESTATE: ['Basic Info', 'Real Estate', 'Finance', 'Address', 'Employment', 'Lead Info'],
  FINANCE: ['Basic Info', 'Finance', 'Employment', 'Address', 'Lead Info', 'Preferences'],
  AUTOMOTIVE: ['Basic Info', 'Automotive', 'Finance', 'Address', 'Lead Info', 'Preferences'],
  TRAVEL: ['Basic Info', 'Travel', 'Address', 'Preferences', 'Lead Info'],
  RETAIL: ['Basic Info', 'Retail', 'Address', 'Preferences', 'Lead Info'],
  B2B: ['Basic Info', 'Business', 'Employment', 'Address', 'Lead Info', 'Preferences'],
  RECRUITMENT: ['Basic Info', 'Employment', 'Education', 'Address', 'Lead Info'],
  GENERAL: ['Basic Info', 'Address', 'Lead Info', 'Preferences'],
};

export default function ColumnMappingStep({
  preview,
  onConfirm,
  onBack,
  isLoading,
  industry = 'GENERAL',
}: ColumnMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    const initialMappings: ColumnMapping[] = preview.columns.map((col) => ({
      sourceColumn: col.name,
      targetField: col.detectedAs,
      customFieldName: col.detectedAs === 'customField' ? col.name : undefined,
    }));
    setMappings(initialMappings);
  }, [preview]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField, customFieldName: targetField === 'customField' ? m.sourceColumn : undefined }
          : m
      )
    );
  };

  const handleCustomFieldNameChange = (sourceColumn: string, customFieldName: string) => {
    setMappings((prev) =>
      prev.map((m) => m.sourceColumn === sourceColumn ? { ...m, customFieldName } : m)
    );
  };

  const resetMappings = () => {
    const initialMappings: ColumnMapping[] = preview.columns.map((col) => ({
      sourceColumn: col.name,
      targetField: col.detectedAs,
      customFieldName: col.detectedAs === 'customField' ? col.name : undefined,
    }));
    setMappings(initialMappings);
  };

  const getFieldInfo = (fieldKey: string) => preview.systemFields.find((f) => f.key === fieldKey);
  const isRequiredField = (fieldKey: string) => getFieldInfo(fieldKey)?.required || false;

  const requiredFields = preview.systemFields.filter((f) => f.required);
  const mappedFields = mappings.map((m) => m.targetField);
  const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f.key));
  const canProceed = missingRequired.length === 0;

  const mappedCount = mappings.filter((m) => m.targetField !== 'skip' && m.targetField !== 'customField').length;
  const customCount = mappings.filter((m) => m.targetField === 'customField').length;
  const skippedCount = mappings.filter((m) => m.targetField === 'skip').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
            <TableCellsIcon className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Map Columns</h2>
              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 text-blue-600 rounded">
                {industry.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {preview.columns.length} columns • {preview.totalRows.toLocaleString()} records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-gray-500"><span className="font-medium text-gray-700">{mappedCount}</span> mapped</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              <span className="text-gray-500"><span className="font-medium text-gray-700">{customCount}</span> custom</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span className="text-gray-500"><span className="font-medium text-gray-700">{skippedCount}</span> skip</span>
            </div>
          </div>
          <button
            onClick={resetMappings}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Warning */}
      {missingRequired.length > 0 && (
        <div className="flex-shrink-0 mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700">
            Map required: <span className="font-medium">{missingRequired.map((f) => f.label).join(', ')}</span>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              {/* Column Names */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 w-6 px-1 py-1.5 text-center text-[10px] font-medium text-gray-400 border-r border-gray-200">

                </th>
                {preview.columns.map((col, index) => (
                  <th key={col.name} className="px-2 py-1.5 text-left border-r border-gray-100 min-w-[140px]">
                    <div className="text-[9px] text-gray-400 font-normal">Col {index + 1}</div>
                    <div className="text-[11px] font-semibold text-gray-800 uppercase truncate max-w-[130px]" title={col.name}>
                      {col.name}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Status */}
              <tr className="bg-white border-b border-gray-200">
                <td className="sticky left-0 z-20 bg-white w-6 px-1 py-1 text-[8px] font-medium text-gray-400 text-center border-r border-gray-200">

                </td>
                {preview.columns.map((col) => {
                  const mapping = mappings.find((m) => m.sourceColumn === col.name);
                  const targetField = mapping?.targetField || 'customField';

                  let badgeClass = 'bg-gray-100 text-gray-500';
                  let badgeText = 'Skip';

                  if (targetField === 'skip') {
                    badgeClass = 'bg-gray-100 text-gray-500';
                    badgeText = 'Skip';
                  } else if (targetField === 'customField') {
                    badgeClass = 'bg-violet-100 text-violet-600';
                    badgeText = 'Custom';
                  } else if (isRequiredField(targetField)) {
                    badgeClass = 'bg-emerald-100 text-emerald-600';
                    badgeText = 'Required';
                  } else {
                    badgeClass = 'bg-sky-100 text-sky-600';
                    badgeText = 'Mapped';
                  }

                  return (
                    <td key={col.name} className="px-2 py-1 border-r border-gray-100">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Map To */}
              <tr className="bg-white border-b-2 border-gray-200">
                <td className="sticky left-0 z-20 bg-white w-6 px-1 py-1.5 text-center border-r border-gray-200">
                  <span className="text-[8px] font-semibold text-blue-600">MAP</span>
                </td>
                {preview.columns.map((col) => {
                  const mapping = mappings.find((m) => m.sourceColumn === col.name);
                  const targetField = mapping?.targetField || 'customField';
                  const isCustomField = targetField === 'customField';
                  const isRequired = isRequiredField(targetField);
                  const isSkip = targetField === 'skip';

                  let selectClass = 'border-gray-200 text-gray-700';
                  if (isSkip) selectClass = 'border-gray-200 text-gray-400 bg-gray-50';
                  else if (isCustomField) selectClass = 'border-violet-300 text-violet-700 bg-violet-50';
                  else if (isRequired) selectClass = 'border-emerald-300 text-emerald-700 bg-emerald-50';
                  else selectClass = 'border-sky-300 text-sky-700 bg-sky-50';

                  // Build options for searchable select
                  const allCategories = [...new Set(preview.systemFields.map((f) => f.category || 'Other'))];
                  const industryCategories = INDUSTRY_CATEGORIES[industry] || INDUSTRY_CATEGORIES.GENERAL;
                  const relevantCategories = industryCategories.filter(cat => allCategories.includes(cat));

                  const selectOptions: { key: string; label: string; category?: string; required?: boolean }[] = [];

                  relevantCategories.forEach((category) => {
                    const fields = preview.systemFields.filter((f) => (f.category || 'Other') === category && f.key !== 'customField' && f.key !== 'skip');
                    fields.forEach((field) => {
                      selectOptions.push({
                        key: field.key,
                        label: field.label,
                        category,
                        required: field.required,
                      });
                    });
                  });

                  // Add actions
                  selectOptions.push({ key: 'customField', label: 'Custom Field', category: 'Actions' });
                  selectOptions.push({ key: 'skip', label: 'Skip Column', category: 'Actions' });

                  return (
                    <td key={col.name} className="px-1.5 py-1 border-r border-gray-100">
                      <SearchableSelect
                        value={targetField}
                        onChange={(value) => handleMappingChange(col.name, value)}
                        options={selectOptions}
                        className={selectClass}
                        placeholder="Select..."
                      />
                      {isCustomField && (
                        <input
                          type="text"
                          value={mapping?.customFieldName || col.name}
                          onChange={(e) => handleCustomFieldNameChange(col.name, e.target.value)}
                          className="w-full mt-1 text-[10px] border border-violet-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Sample Rows */}
              {Array.from({ length: Math.min(3, preview.columns[0]?.sampleValues.length || 0) }).map((_, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-white w-6 px-1 py-1.5 text-[10px] text-gray-400 text-center border-r border-gray-200">
                    {rowIndex + 1}
                  </td>
                  {preview.columns.map((col) => {
                    const mapping = mappings.find((m) => m.sourceColumn === col.name);
                    const isSkipped = mapping?.targetField === 'skip';
                    return (
                      <td
                        key={col.name}
                        className={`px-2 py-1.5 border-r border-gray-100 text-[11px] ${isSkipped ? 'text-gray-300 line-through' : 'text-gray-600'}`}
                      >
                        <span className="truncate block max-w-[130px]">
                          {col.sampleValues[rowIndex] || <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {canProceed ? (
            <>
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-700">Ready!</span>
              <span className="text-xs text-gray-500">{preview.totalRows.toLocaleString()} records</span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Map required fields</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </button>
          <button
            onClick={() => onConfirm(mappings)}
            disabled={!canProceed || isLoading}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold ${
              canProceed && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                Import {preview.totalRows.toLocaleString()}
                <CheckIcon className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
