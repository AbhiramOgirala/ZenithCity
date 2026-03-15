import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_points: number;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  viewer_rank: number;
  viewer_points: number;
  current_type: 'all-time' | 'weekly' | 'monthly';
  loading: boolean;
}

const initialState: LeaderboardState = {
  entries: [],
  viewer_rank: 0,
  viewer_points: 0,
  current_type: 'all-time',
  loading: false,
};

export const fetchLeaderboard = createAsyncThunk('leaderboard/fetch', async (type: string = 'all-time', { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('zenith_token');
    if (!token) {
      return rejectWithValue('Not authenticated');
    }
    return await api.get(`/leaderboards/${type}`);
  }
  catch (err: any) { return rejectWithValue(err.message); }
});

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    setType(state, action) { state.current_type = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (s) => { s.loading = true; })
      .addCase(fetchLeaderboard.fulfilled, (s, a) => {
        s.loading = false;
        s.entries = a.payload.entries;
        s.viewer_rank = a.payload.viewer_rank;
        s.viewer_points = a.payload.viewer_points;
      })
      .addCase(fetchLeaderboard.rejected, (s) => { s.loading = false; });
  },
});

export const { setType } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
