import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { leadService, Lead, LeadFilter, LeadStats, BulkUploadResult } from '../../services/lead.service';

interface LeadState {
  leads: Lead[];
  currentLead: Lead | null;
  stats: LeadStats | null;
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  bulkUploadResult: BulkUploadResult | null;
}

const initialState: LeadState = {
  leads: [],
  currentLead: null,
  stats: null,
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  error: null,
  bulkUploadResult: null,
};

export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (filter: LeadFilter & { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await leadService.getAll(filter);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch leads');
    }
  }
);

export const fetchLeadById = createAsyncThunk(
  'leads/fetchLeadById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await leadService.getById(id);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch lead');
    }
  }
);

export const createLead = createAsyncThunk(
  'leads/createLead',
  async (data: Partial<Lead>, { rejectWithValue }) => {
    try {
      const response = await leadService.create(data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create lead');
    }
  }
);

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ id, data }: { id: string; data: Partial<Lead> }, { rejectWithValue }) => {
    try {
      const response = await leadService.update(id, data);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update lead');
    }
  }
);

export const deleteLead = createAsyncThunk(
  'leads/deleteLead',
  async (id: string, { rejectWithValue }) => {
    try {
      await leadService.delete(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete lead');
    }
  }
);

export const assignLead = createAsyncThunk(
  'leads/assignLead',
  async ({ leadId, assignedToId }: { leadId: string; assignedToId: string }, { rejectWithValue }) => {
    try {
      const response = await leadService.assign(leadId, assignedToId);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to assign lead');
    }
  }
);

export const fetchLeadStats = createAsyncThunk(
  'leads/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await leadService.getStats();
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const bulkUploadLeads = createAsyncThunk(
  'leads/bulkUpload',
  async ({ file, counselorIds }: { file: File; counselorIds?: string[] }, { rejectWithValue }) => {
    try {
      const response = await leadService.bulkUpload(file, counselorIds);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to upload leads');
    }
  }
);

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBulkUploadResult: (state) => {
      state.bulkUploadResult = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch leads
    builder.addCase(fetchLeads.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchLeads.fulfilled, (state, action) => {
      state.isLoading = false;
      state.leads = action.payload.leads;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    });
    builder.addCase(fetchLeads.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch lead by ID
    builder.addCase(fetchLeadById.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchLeadById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentLead = action.payload;
    });
    builder.addCase(fetchLeadById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create lead
    builder.addCase(createLead.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createLead.fulfilled, (state, action) => {
      state.isLoading = false;
      state.leads.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createLead.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update lead
    builder.addCase(updateLead.fulfilled, (state, action) => {
      const index = state.leads.findIndex((l) => l.id === action.payload.id);
      if (index !== -1) {
        state.leads[index] = action.payload;
      }
      if (state.currentLead?.id === action.payload.id) {
        state.currentLead = action.payload;
      }
    });

    // Delete lead
    builder.addCase(deleteLead.fulfilled, (state, action) => {
      state.leads = state.leads.filter((l) => l.id !== action.payload);
      state.total -= 1;
    });

    // Fetch stats
    builder.addCase(fetchLeadStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Bulk upload
    builder.addCase(bulkUploadLeads.pending, (state) => {
      state.isLoading = true;
      state.bulkUploadResult = null;
    });
    builder.addCase(bulkUploadLeads.fulfilled, (state, action) => {
      state.isLoading = false;
      state.bulkUploadResult = action.payload;
    });
    builder.addCase(bulkUploadLeads.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, clearBulkUploadResult, setPage } = leadSlice.actions;
export default leadSlice.reducer;
