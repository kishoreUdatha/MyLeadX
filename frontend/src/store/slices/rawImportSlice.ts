import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  rawImportService,
  BulkImport,
  RawImportRecord,
  RawImportStats,
  RecordFilter,
} from '../../services/rawImport.service';

interface RawImportState {
  imports: BulkImport[];
  currentImport: BulkImport | null;
  records: RawImportRecord[];
  selectedRecords: string[];
  stats: RawImportStats | null;
  total: number;
  recordsTotal: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: RawImportState = {
  imports: [],
  currentImport: null,
  records: [],
  selectedRecords: [],
  stats: null,
  total: 0,
  recordsTotal: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  error: null,
};

// Async Thunks
export const fetchBulkImports = createAsyncThunk(
  'rawImports/fetchBulkImports',
  async ({ page, limit }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      return await rawImportService.getBulkImports(page, limit);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch bulk imports');
    }
  }
);

export const fetchBulkImportById = createAsyncThunk(
  'rawImports/fetchBulkImportById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await rawImportService.getBulkImportById(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch bulk import');
    }
  }
);

export const fetchStats = createAsyncThunk(
  'rawImports/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await rawImportService.getStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchRecords = createAsyncThunk(
  'rawImports/fetchRecords',
  async (filter: RecordFilter, { rejectWithValue }) => {
    try {
      return await rawImportService.getRecords(filter);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch records');
    }
  }
);

export const assignToTelecallers = createAsyncThunk(
  'rawImports/assignToTelecallers',
  async (
    { recordIds, telecallerIds }: { recordIds: string[]; telecallerIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      return await rawImportService.assignToTelecallers(recordIds, telecallerIds);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to assign to telecallers');
    }
  }
);

export const assignToAIAgent = createAsyncThunk(
  'rawImports/assignToAIAgent',
  async (
    { recordIds, agentId }: { recordIds: string[]; agentId: string },
    { rejectWithValue }
  ) => {
    try {
      return await rawImportService.assignToAIAgent(recordIds, agentId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to assign to AI agent');
    }
  }
);

export const convertToLead = createAsyncThunk(
  'rawImports/convertToLead',
  async (
    {
      recordId,
      options,
    }: { recordId: string; options?: { source?: string; priority?: string; notes?: string } },
    { rejectWithValue }
  ) => {
    try {
      return await rawImportService.convertToLead(recordId, options);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to convert to lead');
    }
  }
);

export const bulkConvertToLeads = createAsyncThunk(
  'rawImports/bulkConvertToLeads',
  async (recordIds: string[], { rejectWithValue }) => {
    try {
      return await rawImportService.bulkConvertToLeads(recordIds);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to bulk convert to leads');
    }
  }
);

const rawImportSlice = createSlice({
  name: 'rawImports',
  initialState,
  reducers: {
    setSelectedRecords: (state, action: PayloadAction<string[]>) => {
      state.selectedRecords = action.payload;
    },
    toggleRecordSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.selectedRecords.includes(id)) {
        state.selectedRecords = state.selectedRecords.filter((r) => r !== id);
      } else {
        state.selectedRecords.push(id);
      }
    },
    selectAllRecords: (state) => {
      state.selectedRecords = state.records.map((r) => r.id);
    },
    clearSelectedRecords: (state) => {
      state.selectedRecords = [];
    },
    clearCurrentImport: (state) => {
      state.currentImport = null;
      state.records = [];
      state.selectedRecords = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Bulk Imports
    builder
      .addCase(fetchBulkImports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBulkImports.fulfilled, (state, action) => {
        state.isLoading = false;
        state.imports = action.payload.imports;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchBulkImports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Bulk Import By ID
    builder
      .addCase(fetchBulkImportById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBulkImportById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentImport = action.payload;
      })
      .addCase(fetchBulkImportById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Stats
    builder
      .addCase(fetchStats.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch Records
    builder
      .addCase(fetchRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload.records;
        state.recordsTotal = action.payload.total;
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Assign to Telecallers
    builder
      .addCase(assignToTelecallers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignToTelecallers.fulfilled, (state) => {
        state.isLoading = false;
        state.selectedRecords = [];
      })
      .addCase(assignToTelecallers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Assign to AI Agent
    builder
      .addCase(assignToAIAgent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignToAIAgent.fulfilled, (state) => {
        state.isLoading = false;
        state.selectedRecords = [];
      })
      .addCase(assignToAIAgent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Convert to Lead
    builder
      .addCase(convertToLead.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(convertToLead.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(convertToLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Bulk Convert to Leads
    builder
      .addCase(bulkConvertToLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkConvertToLeads.fulfilled, (state) => {
        state.isLoading = false;
        state.selectedRecords = [];
      })
      .addCase(bulkConvertToLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedRecords,
  toggleRecordSelection,
  selectAllRecords,
  clearSelectedRecords,
  clearCurrentImport,
  clearError,
} = rawImportSlice.actions;

export default rawImportSlice.reducer;
