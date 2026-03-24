import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  points_balance?: number;
  technique_mastery_badge?: boolean;
  privacy_mode?: boolean;
  battle_auto_enroll?: boolean;
  fitness_level?: string;
  fitness_goal?: string;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: string;
  health_issues?: string;
  target_weight_kg?: number;
  time_period_weeks?: number;
  time_per_day_minutes?: number;
  onboarding_completed?: boolean;
  diet_preference?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('zenith_user') || 'null'),
  token: localStorage.getItem('zenith_token'),
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (creds: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const data = await api.post('/auth/login', creds);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

export const register = createAsyncThunk('auth/register', async (creds: { email: string; password: string; username: string }, { rejectWithValue }) => {
  try {
    const data = await api.post('/auth/register', creds);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    return await api.get('/auth/profile');
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('zenith_token');
      localStorage.removeItem('zenith_user');
    },
    updateBalance(state, action: PayloadAction<number>) {
      if (state.user) state.user.points_balance = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload.user;
        s.token = a.payload.token;
        localStorage.setItem('zenith_token', a.payload.token);
        localStorage.setItem('zenith_user', JSON.stringify(a.payload.user));
      })
      .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(register.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(register.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload.user;
        s.token = a.payload.token;
        localStorage.setItem('zenith_token', a.payload.token);
        localStorage.setItem('zenith_user', JSON.stringify(a.payload.user));
      })
      .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(fetchProfile.fulfilled, (s, a) => {
        if (s.user) s.user = { ...s.user, ...a.payload };
      });
  },
});

export const { logout, updateBalance, clearError } = authSlice.actions;
export default authSlice.reducer;
