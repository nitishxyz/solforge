import { create } from 'zustand';

interface AgiState {
  isOpen: boolean;
  activeSessionId: string | null;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export const useAgiStore = create<AgiState>((set) => ({
  isOpen: false,
  activeSessionId: null,
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open: boolean) => set({ isOpen: open }),
  setActiveSessionId: (sessionId: string | null) => set({ activeSessionId: sessionId }),
}));
