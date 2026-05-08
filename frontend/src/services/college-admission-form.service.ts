import api from './api';

export interface FormField {
  key: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  gridSpan?: number;
}

export interface FormSection {
  name: string;
  description?: string;
  fields: string[];
}

export interface CollegeAdmissionForm {
  id: string;
  organizationId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  formName: string;
  description?: string;
  formFields: FormField[];
  sections: FormSection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormDto {
  universityId: string;
  collegeId?: string;
  courseId?: string;
  formName: string;
  description?: string;
  formFields: FormField[];
  sections?: FormSection[];
}

export interface UpdateFormDto {
  formName?: string;
  description?: string;
  formFields?: FormField[];
  sections?: FormSection[];
  isActive?: boolean;
}

class CollegeAdmissionFormService {
  // Get default form template
  async getTemplate(): Promise<{ formFields: FormField[]; sections: FormSection[] }> {
    const response = await api.get('/college-admission-forms/template');
    return response.data.data;
  }

  // Create new form
  async createForm(data: CreateFormDto): Promise<CollegeAdmissionForm> {
    const response = await api.post('/college-admission-forms', data);
    return response.data.data;
  }

  // List all forms
  async listForms(params?: {
    universityId?: string;
    collegeId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ forms: CollegeAdmissionForm[]; pagination: any }> {
    const response = await api.get('/college-admission-forms', { params });
    return { forms: response.data.data, pagination: response.data.pagination };
  }

  // Get form by ID
  async getFormById(id: string): Promise<CollegeAdmissionForm> {
    const response = await api.get(`/college-admission-forms/${id}`);
    return response.data.data;
  }

  // Lookup form for college (with inheritance)
  async lookupForm(universityId: string, collegeId?: string, courseId?: string): Promise<CollegeAdmissionForm | null> {
    const response = await api.get('/college-admission-forms/lookup', {
      params: { universityId, collegeId, courseId },
    });
    return response.data.data;
  }

  // Update form
  async updateForm(id: string, data: UpdateFormDto): Promise<CollegeAdmissionForm> {
    const response = await api.patch(`/college-admission-forms/${id}`, data);
    return response.data.data;
  }

  // Clone form
  async cloneForm(id: string, data: { collegeId?: string; courseId?: string; formName: string }): Promise<CollegeAdmissionForm> {
    const response = await api.post(`/college-admission-forms/${id}/clone`, data);
    return response.data.data;
  }

  // Delete form
  async deleteForm(id: string): Promise<void> {
    await api.delete(`/college-admission-forms/${id}`);
  }
}

export const collegeAdmissionFormService = new CollegeAdmissionFormService();
