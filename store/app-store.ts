import { create } from "zustand";
import { SyncStatus } from "@/lib/sync-engine";

interface AppStore {
  syncStatus: SyncStatus;
  setSyncStatus: (s: SyncStatus) => void;
  pendingCount: number;
  setPendingCount: (n: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  syncStatus: "idle",
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  pendingCount: 0,
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
