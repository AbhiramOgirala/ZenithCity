import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface Battle {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  is_enrolled: boolean;
  participant_count: number;
}

interface BattleState {
  battles: Battle[];
  activeBattle: any | null;
  loading: boolean;
}

const initialState: BattleState = {
  battles: [],
  activeBattle: null,
  loading: false,
};

export const fetchBattles = createAsyncThunk('battle/fetchAll', async (_, { rejectWithValue }) => {
  try { return await api.get('/battles/upcoming'); }
  catch (err: any) { return rejectWithValue(err.message); }
});

export const joinBattle = createAsyncThunk('battle/join', async (battleId: string, { rejectWithValue }) => {
  try { return await api.post(`/battles/${battleId}/join`, {}); }
  catch (err: any) { return rejectWithValue(err.message); }
});

export const fetchBattleDetail = createAsyncThunk('battle/fetchDetail', async (battleId: string, { rejectWithValue }) => {
  try { return await api.get(`/battles/${battleId}`); }
  catch (err: any) { return rejectWithValue(err.message); }
});

const battleSlice = createSlice({
  name: 'battle',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBattles.pending, (s) => { s.loading = true; })
      .addCase(fetchBattles.fulfilled, (s, a) => { s.loading = false; s.battles = a.payload; })
      .addCase(fetchBattles.rejected, (s) => { s.loading = false; })
      .addCase(joinBattle.fulfilled, (s, a) => {
        const battle = s.battles.find(b => b.id === a.payload.battle_id);
        if (battle) { battle.is_enrolled = true; battle.participant_count++; }
      })
      .addCase(fetchBattleDetail.fulfilled, (s, a) => { s.activeBattle = a.payload; });
  },
});

export default battleSlice.reducer;
