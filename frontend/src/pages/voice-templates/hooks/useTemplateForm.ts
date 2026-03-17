/**
 * Template Form Hook
 * Manages form state for creating/editing voice templates
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { TemplateFormData, Question, FAQ, TemplateDocument, initialFormData } from '../edit-template.types';

interface UseTemplateFormReturn {
  formData: TemplateFormData;
  loading: boolean;
  saving: boolean;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  handleSave: () => Promise<void>;
  addQuestion: () => void;
  updateQuestion: (index: number, updates: Partial<Question>) => void;
  removeQuestion: (index: number) => void;
  addFAQ: () => void;
  updateFAQ: (index: number, updates: Partial<FAQ>) => void;
  removeFAQ: (index: number) => void;
  addDocument: () => void;
  updateDocument: (index: number, updates: Partial<TemplateDocument>) => void;
  removeDocument: (index: number) => void;
}

export function useTemplateForm(id: string | undefined): UseTemplateFormReturn {
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch template when editing
  useEffect(() => {
    if (isEditing) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voice-templates/${id}`);
      const template = response.data.data;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        industry: template.industry || 'EDUCATION',
        category: template.category || '',
        systemPrompt: template.systemPrompt || '',
        knowledgeBase: template.knowledgeBase || '',
        questions: template.questions || [],
        faqs: template.faqs || [],
        documents: template.documents || [],
        greeting: template.greeting || '',
        greetings: template.greetings || {},
        fallbackMessage: template.fallbackMessage || '',
        transferMessage: template.transferMessage || '',
        endMessage: template.endMessage || '',
        afterHoursMessage: template.afterHoursMessage || '',
        language: template.language || 'en-IN',
        voiceId: template.voiceId || 'alloy',
        temperature: template.temperature || 0.7,
        personality: template.personality || 'professional',
        responseSpeed: template.responseSpeed || 'normal',
        maxDuration: template.maxDuration || 300,
        workingHoursEnabled: template.workingHoursEnabled || false,
        workingHoursStart: template.workingHoursStart || '09:00',
        workingHoursEnd: template.workingHoursEnd || '18:00',
        workingDays: template.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        autoCreateLeads: template.autoCreateLeads ?? true,
        deduplicateByPhone: template.deduplicateByPhone ?? true,
        appointmentEnabled: template.appointmentEnabled || false,
        appointmentType: template.appointmentType || '',
        appointmentDuration: template.appointmentDuration || 30,
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Failed to load template');
      navigate('/voice-templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/voice-templates/${id}`, formData);
        toast.success('Template updated successfully');
      } else {
        await api.post('/voice-templates', formData);
        toast.success('Template created successfully');
      }
      navigate('/voice-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }, [formData, isEditing, id, navigate]);

  // Question management
  const addQuestion = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { id: Date.now().toString(), question: '', field: 'custom1', required: false },
      ],
    }));
  }, []);

  const updateQuestion = useCallback((index: number, updates: Partial<Question>) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = { ...newQuestions[index], ...updates };
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  }, []);

  // FAQ management
  const addFAQ = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        { id: Date.now().toString(), question: '', answer: '' },
      ],
    }));
  }, []);

  const updateFAQ = useCallback((index: number, updates: Partial<FAQ>) => {
    setFormData(prev => {
      const newFaqs = [...prev.faqs];
      newFaqs[index] = { ...newFaqs[index], ...updates };
      return { ...prev, faqs: newFaqs };
    });
  }, []);

  const removeFAQ = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  }, []);

  // Document management
  const addDocument = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      documents: [
        ...prev.documents,
        { id: Date.now().toString(), name: '', type: 'pdf', url: '', description: '', keywords: [] },
      ],
    }));
  }, []);

  const updateDocument = useCallback((index: number, updates: Partial<TemplateDocument>) => {
    setFormData(prev => {
      const newDocs = [...prev.documents];
      newDocs[index] = { ...newDocs[index], ...updates };
      return { ...prev, documents: newDocs };
    });
  }, []);

  const removeDocument = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  }, []);

  return {
    formData,
    loading,
    saving,
    setFormData,
    handleSave,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addFAQ,
    updateFAQ,
    removeFAQ,
    addDocument,
    updateDocument,
    removeDocument,
  };
}

export default useTemplateForm;
