/**
 * Connection state store — tracks whether the Caddy Admin API is reachable.
 */

import { create } from "zustand";

export type ConnectionStatus = "connected" | "disconnected" | "checking";

interface ConnectionState {
  status: ConnectionStatus;
  lastChecked: Date | null;
  setStatus: (status: ConnectionStatus) => void;
  setLastChecked: (date: Date) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "checking",
  lastChecked: null,
  setStatus: (status) => set({ status }),
  setLastChecked: (date) => set({ lastChecked: date }),
}));
