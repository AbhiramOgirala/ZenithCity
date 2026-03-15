import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cityReducer from './slices/citySlice';
import workoutReducer from './slices/workoutSlice';
import leaderboardReducer from './slices/leaderboardSlice';
import battleReducer from './slices/battleSlice';
import dashboardReducer from './slices/dashboardSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    city: cityReducer,
    workout: workoutReducer,
    leaderboard: leaderboardReducer,
    battle: battleReducer,
    dashboard: dashboardReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
