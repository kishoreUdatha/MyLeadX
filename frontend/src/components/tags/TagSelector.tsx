/**
 * Tag Selector Component
 * Allows selecting and assigning tags to leads
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import leadTagsService, { LeadTag } from '../../services/lead-tags.service';

interface TagSelectorProps {
  leadId: string;
  onTagsChange?: (tags: LeadTag[]) => void;
  compact?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
}

const TagSelector: React.FC<TagSelectorProps> = ({ leadId, onTagsChange, compact = false }) => {
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [leadId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideContainer && isOutsideDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tagsData, leadTagsData] = await Promise.all([
        leadTagsService.getTags(false),
        leadTagsService.getLeadTags(leadId).catch((err) => {
          // 404 means lead doesn't belong to user's organization
          if (err.response?.status === 404) {
            console.warn('Lead not accessible - may belong to different organization');
          }
          return [];
        }),
      ]);
      setAllTags(tagsData.tags || []);
      // Ensure leadTagsData is always an array
      const tagsArray = Array.isArray(leadTagsData) ? leadTagsData :
                        (leadTagsData?.tags ? leadTagsData.tags : []);
      setLeadTags(tagsArray);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setAllTags([]);
      setLeadTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = async (tag: LeadTag) => {
    const isAssigned = leadTags.some((t) => t.id === tag.id);

    try {
      setSaving(true);
      if (isAssigned) {
        await leadTagsService.removeTagsFromLead(leadId, [tag.id]);
        const newTags = leadTags.filter((t) => t.id !== tag.id);
        setLeadTags(newTags);
        onTagsChange?.(newTags);
      } else {
        await leadTagsService.assignTagsToLead(leadId, [tag.id]);
        const newTags = [...leadTags, tag];
        setLeadTags(newTags);
        onTagsChange?.(newTags);
      }
      setShowDropdown(false);
    } catch (err: any) {
      console.error('Failed to toggle tag:', err);
      // Handle 401 - session expired
      if (err.response?.status === 401) {
        alert('Session expired. Please refresh the page and login again.');
        return;
      }
      // Handle 404 - lead not in user's organization
      if (err.response?.status === 404) {
        alert('This lead belongs to a different organization. You cannot modify its tags.');
        return;
      }
      const errorMsg = err.response?.data?.message || 'Failed to update tag';
      alert(errorMsg);
      // Refresh data to sync state
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = leadTags.find((t) => t.id === tagId);
    if (tag) {
      await handleToggleTag(tag);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <span className="text-xs text-gray-400">Loading tags...</span>
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No tags available.{' '}
        <a href="/settings/tags" className="text-indigo-600 hover:text-indigo-700">
          Create tags
        </a>
      </div>
    );
  }

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      updateDropdownPosition();
    }
    setShowDropdown(!showDropdown);
  };

  const dropdownContent = showDropdown && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-64 overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      {allTags.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">No tags available</div>
      ) : (
        allTags.map((tag) => {
          const isAssigned = leadTags.some((t) => t.id === tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => handleToggleTag(tag)}
              disabled={saving}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 ${
                isAssigned ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className={isAssigned ? 'text-indigo-700 font-medium' : 'text-gray-700'}>
                  {tag.name}
                </span>
              </div>
              {isAssigned && <CheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap items-center gap-1.5">
        {leadTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => handleRemoveTag(tag.id, e)}
              className="hover:bg-white/20 rounded-full p-0.5"
              disabled={saving}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors ${
            compact ? '' : 'py-1'
          }`}
        >
          <PlusIcon className="w-3 h-3" />
          {!compact && 'Add Tag'}
        </button>
      </div>

      {/* Dropdown rendered via portal to escape overflow:hidden containers */}
      {createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default TagSelector;
