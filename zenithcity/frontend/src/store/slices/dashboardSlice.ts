import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface DashboardState {
  data: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = { data: null, loading: false, error: null };

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async (_, { rejectWithValue, getState }) => {
  try {
    const token = localStorage.getItem('zenith_token');
    if (!token) {
      return rejectWithValue('Not authenticated');
    }
    return await api.get('/dashboard');
  }
  catch (err: any) { return rejectWithValue(err.message); }
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchDashboard.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchDashboard.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
  },
});

export default dashboardSlice.reducer;
