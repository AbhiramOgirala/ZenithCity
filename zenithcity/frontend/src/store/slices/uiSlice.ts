import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  toasts: Toast[];
  sidebarOpen: boolean;
  activeModal: string | null;
}

const initialState: UIState = {
  toasts: [],
  sidebarOpen: false,
  activeModal: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
      state.toasts.push({ ...action.payload, id: Date.now().toString() });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    setModal(state, action: PayloadAction<string | null>) { state.activeModal = action.payload; },
  },
});

export const { addToast, removeToast, toggleSidebar, setModal } = uiSlice.actions;
export default uiSlice.reducer;
