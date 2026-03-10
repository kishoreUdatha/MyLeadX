import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { leadService, Lead } from '../../services/lead.service';

interface LeadState {
  leads: Lead[];
  currentLead: Lead | null;
  total: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: LeadState = {
  leads: [],
  currentLead: null,
  total: 0,
  isLoading: false,
  error: null,
};

export const fetchMyLeads = createAsyncThunk(
  'leads/fetchMyLeads',
  async (params: { page?: number; status?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await leadService.getMyLeads(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leads');
    }
  }
);

export const fetchLeadById = createAsyncThunk(
  'leads/fetchLeadById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await leadService.getById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lead');
    }
  }
);

export const updateLeadStatus = createAsyncThunk(
  'leads/updateStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await leadService.updateStatus(id, status);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lead');
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyLeads.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMyLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = action.payload.leads;
        state.total = action.payload.total;
      })
      .addCase(fetchMyLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchLeadById.fulfilled, (state, action) => {
        state.currentLead = action.payload;
      })
      .addCase(updateLeadStatus.fulfilled, (state, action) => {
        const index = state.leads.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) {
          state.leads[index] = action.payload;
        }
        if (state.currentLead?.id === action.payload.id) {
          state.currentLead = action.payload;
        }
      });
  },
});

export const { clearError } = leadSlice.actions;
export default leadSlice.reducer;
