import { create } from "zustand";
import type { RecognizedPage } from "@/types/finance";

export type ScanStatus = "idle" | "waiting-stable" | "analyzing" | "recognized" | "error";

interface DocumentState {
  page: RecognizedPage | null;
  scanStatus: ScanStatus;
  lastScanAt: number | null;
  lastLatencyMs: number | null;
  hudVisible: boolean;
  setPage: (p: RecognizedPage | null, latencyMs?: number) => void;
  setScanStatus: (s: ScanStatus) => void;
  toggleHud: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  page: null,
  scanStatus: "idle",
  lastScanAt: null,
  lastLatencyMs: null,
  hudVisible: false,
  setPage: (page, latencyMs) =>
    set({
      page,
      scanStatus: page ? "recognized" : "idle",
      lastScanAt: Date.now(),
      lastLatencyMs: latencyMs ?? null,
    }),
  setScanStatus: (scanStatus) => set({ scanStatus }),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
}));
