import { create } from "zustand";
import type { Stroke } from "@/lib/gesture/strokes";
import type { BBox } from "@/types/finance";

interface Selection {
  metricId: string;
  cellIndex: number | null;
  bbox: BBox;
}

interface InteractionState {
  strokes: Stroke[];
  selection: Selection | null;
  sheetOpen: boolean;
  toast: string | null;
  addStroke: (s: Stroke) => void;
  clearStrokes: () => void;
  select: (s: Selection) => void;
  closeSheet: () => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useInteractionStore = create<InteractionState>((set) => ({
  strokes: [],
  selection: null,
  sheetOpen: false,
  toast: null,
  addStroke: (s) => set((st) => ({ strokes: [...st.strokes.slice(-7), s] })),
  clearStrokes: () => set({ strokes: [] }),
  select: (selection) => set({ selection, sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false, strokes: [] }),
  showToast: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
}));
