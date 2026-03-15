import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { updateBalance } from './authSlice';

interface WorkoutSession {
  id: string;
  exercise_type: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_reps: number;
  valid_reps: number;
  form_accuracy: number;
  points_earned: number;
  gps_distance_km: number;
  verification_status: string;
}

interface WorkoutState {
  active_session: WorkoutSession | null;
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  last_completed: WorkoutSession | null;
}

const initialState: WorkoutState = {
  active_session: null, sessions: [], loading: false, error: null, last_completed: null,
};

export const startWorkout = createAsyncThunk(
  'workout/start',
  async (data: { exercise_type: string; verification_status?: string }, { rejectWithValue }) => {
    try { return await api.post('/workouts/start', data); }
    catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const completeWorkout = createAsyncThunk(
  'workout/complete',
  async (
    data: { id: string; total_reps?: number; valid_reps?: number; form_accuracy?: number; verification_status?: string; gps_coordinates?: any[] },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const result = await api.put(`/workouts/${data.id}/complete`, data);
      // result = { session, points_earned, new_balance }
      // Sync the new balance into auth state immediately
      if (result.new_balance !== undefined) {
        dispatch(updateBalance(result.new_balance));
      }
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchHistory = createAsyncThunk(
  'workout/history',
  async (page: number = 1, { rejectWithValue }) => {
    try { return await api.get(`/workouts/history?page=${page}`); }
    catch (err: any) { return rejectWithValue(err.message); }
  }
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    clearLastCompleted(state) { state.last_completed = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startWorkout.fulfilled, (s, a) => { s.active_session = a.payload; })
      .addCase(completeWorkout.pending, (s) => { s.loading = true; })
      .addCase(completeWorkout.fulfilled, (s, a) => {
        s.loading = false;
        s.active_session = null;
        s.last_completed = a.payload.session;
        s.sessions.unshift(a.payload.session);
      })
      .addCase(completeWorkout.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload as string;
      })
      .addCase(fetchHistory.pending,   (s) => { s.loading = true; })
      .addCase(fetchHistory.fulfilled, (s, a) => { s.loading = false; s.sessions = a.payload.sessions; })
      .addCase(fetchHistory.rejected,  (s) => { s.loading = false; });
  },
});

export const { clearLastCompleted } = workoutSlice.actions;
export default workoutSlice.reducer;
