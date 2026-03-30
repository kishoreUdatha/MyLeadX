import api from './api';

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings?: Record<string, unknown>;
  isPublished: boolean;
  publishedAt?: string;
  embedCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormInput {
  name: string;
  description?: string;
  fields: FormField[];
  settings?: Record<string, unknown>;
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FormField[];
  settings?: Record<string, unknown>;
  isPublished?: boolean;
}

class FormService {
  async create(data: CreateFormInput): Promise<Form> {
    const response = await api.post('/forms', data);
    return response.data.data;
  }

  async getAll(): Promise<Form[]> {
    const response = await api.get('/forms');
    return response.data.data;
  }

  async getById(id: string): Promise<Form> {
    const response = await api.get(`/forms/${id}`);
    return response.data.data;
  }

  async update(id: string, data: UpdateFormInput): Promise<Form> {
    const response = await api.put(`/forms/${id}`, data);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/forms/${id}`);
  }

  async getEmbedCode(id: string): Promise<string> {
    const response = await api.get(`/forms/${id}/embed-code`);
    return response.data.data.embedCode;
  }

  async getPublicForm(id: string): Promise<Form> {
    const response = await api.get(`/forms/public/${id}`);
    return response.data.data;
  }

  async submitForm(id: string, data: Record<string, unknown>): Promise<void> {
    await api.post(`/forms/public/${id}/submit`, data);
  }
}

export const formService = new FormService();
