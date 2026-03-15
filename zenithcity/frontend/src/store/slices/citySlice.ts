import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { updateBalance } from './authSlice';

interface Building {
  id: string;
  type: string;
  level: number;
  status: string;
  health: number;
  position_x: number;
  position_y: number;
  position_z: number;
  construction_completed_at: string;
}

interface City {
  id: string;
  name: string;
  territory_size: number;
  health: number;
  decline_active: boolean;
  last_workout_at: string | null;
  buildings: Building[];
}

interface CityState {
  city: City | null;
  loading: boolean;
  error: string | null;
  buildingPanelOpen: boolean;
}

const initialState: CityState = {
  city: null, loading: false, error: null, buildingPanelOpen: false,
};

export const fetchCity = createAsyncThunk('city/fetch', async (_, { rejectWithValue }) => {
  try { return await api.get('/cities/my-city'); }
  catch (err: any) { return rejectWithValue(err.message); }
});

// constructBuilding now returns { building, new_balance }
export const constructBuilding = createAsyncThunk(
  'city/construct',
  async (data: { type: string; position_x?: number; position_y?: number; position_z?: number }, { rejectWithValue, dispatch }) => {
    try {
      const result = await api.post('/cities/buildings', data);
      // Sync balance immediately
      if (result.new_balance !== undefined) dispatch(updateBalance(result.new_balance));
      return result.building;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// upgradeBuilding now returns { building, new_balance }
export const upgradeBuilding = createAsyncThunk(
  'city/upgrade',
  async (buildingId: string, { rejectWithValue, dispatch }) => {
    try {
      const result = await api.put(`/cities/buildings/${buildingId}/upgrade`, {});
      if (result.new_balance !== undefined) dispatch(updateBalance(result.new_balance));
      return result.building;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// repairBuilding now returns { building, new_balance }
export const repairBuilding = createAsyncThunk(
  'city/repair',
  async (buildingId: string, { rejectWithValue, dispatch }) => {
    try {
      const result = await api.put(`/cities/buildings/${buildingId}/repair`, {});
      if (result.new_balance !== undefined) dispatch(updateBalance(result.new_balance));
      return result.building;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

const citySlice = createSlice({
  name: 'city',
  initialState,
  reducers: {
    setBuildingPanelOpen(state, action) { state.buildingPanelOpen = action.payload; },
    updateCityFromSocket(state, action) {
      if (state.city) state.city = { ...state.city, ...action.payload };
    },
    // Mark a building completed locally (from countdown timer)
    markBuildingComplete(state, action) {
      if (!state.city) return;
      const b = state.city.buildings.find(b => b.id === action.payload);
      if (b) b.status = 'completed';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCity.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchCity.fulfilled, (s, a) => { s.loading = false; s.city = a.payload; })
      .addCase(fetchCity.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(constructBuilding.fulfilled, (s, a) => {
        // a.payload is the building object (new_balance consumed in thunk)
        if (s.city && a.payload) s.city.buildings.push(a.payload);
      })
      .addCase(upgradeBuilding.fulfilled, (s, a) => {
        if (s.city && a.payload) {
          const idx = s.city.buildings.findIndex(b => b.id === a.payload.id);
          if (idx >= 0) s.city.buildings[idx] = a.payload;
        }
      })
      .addCase(repairBuilding.fulfilled, (s, a) => {
        if (s.city && a.payload) {
          const idx = s.city.buildings.findIndex(b => b.id === a.payload.id);
          if (idx >= 0) s.city.buildings[idx] = a.payload;
        }
      });
  },
});

export const { setBuildingPanelOpen, updateCityFromSocket, markBuildingComplete } = citySlice.actions;
export default citySlice.reducer;
