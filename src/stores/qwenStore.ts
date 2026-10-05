import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  createdAt: number;
}

export interface QwenState {
  endpoint: string;
  model: string;
  status: "idle" | "generating" | "connected" | "error";
  latencyMs: number | null;
  errorMessage: string | null;

  // Active generation for selected item
  activeMetricId: string | null;
  activeCellIndex: number | null;
  currentReasoning: string;
  currentContent: string;
  isStreaming: boolean;

  // AR Screen overlay toggle
  showScreenCallout: boolean;

  // Follow-up conversation history keyed by metricId
  threads: Record<string, ChatMessage[]>;

  // Actions
  setEndpoint: (ep: string) => void;
  setModel: (m: string) => void;
  setStatus: (s: QwenState["status"]) => void;
  setStreaming: (st: boolean) => void;
  toggleScreenCallout: () => void;
  clearActive: () => void;
  startExplanation: (metricId: string, cellIndex: number | null) => void;
  appendReasoning: (delta: string) => void;
  appendContent: (delta: string) => void;
  addMessage: (metricId: string, msg: ChatMessage) => void;
  testConnection: () => Promise<boolean>;
}

export const useQwenStore = create<QwenState>((set, get) => ({
  endpoint: "https://wax-collar-lat-alot.trycloudflare.com/v1",
  model: "qwen3.5-9b-mlx",
  status: "idle",
  latencyMs: null,
  errorMessage: null,

  activeMetricId: null,
  activeCellIndex: null,
  currentReasoning: "",
  currentContent: "",
  isStreaming: false,

  showScreenCallout: true,
  threads: {},

  setEndpoint: (endpoint) => set({ endpoint }),
  setModel: (model) => set({ model }),
  setStatus: (status) => set({ status }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  toggleScreenCallout: () => set((s) => ({ showScreenCallout: !s.showScreenCallout })),
  clearActive: () =>
    set({
      activeMetricId: null,
      activeCellIndex: null,
      currentReasoning: "",
      currentContent: "",
      isStreaming: false,
    }),

  startExplanation: (metricId, cellIndex) =>
    set({
      activeMetricId: metricId,
      activeCellIndex: cellIndex,
      currentReasoning: "",
      currentContent: "",
      isStreaming: true,
      status: "generating",
      errorMessage: null,
    }),

  appendReasoning: (delta) =>
    set((s) => ({ currentReasoning: s.currentReasoning + delta })),

  appendContent: (delta) =>
    set((s) => ({ currentContent: s.currentContent + delta })),

  addMessage: (metricId, msg) =>
    set((s) => {
      const existing = s.threads[metricId] || [];
      return {
        threads: {
          ...s.threads,
          [metricId]: [...existing, msg],
        },
      };
    }),

  testConnection: async () => {
    const { endpoint } = get();
    set({ status: "generating", errorMessage: null });
    const started = Date.now();
    try {
      const epClean = endpoint.replace(/\/$/, "");
      const res = await fetch(`${epClean}/models`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const latency = Date.now() - started;
        set({ status: "connected", latencyMs: latency, errorMessage: null });
        return true;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ status: "error", errorMessage: msg });
      return false;
    }
  },
}));
