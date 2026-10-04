import { create } from "zustand";
import { DEFAULT_CALIBRATION, loadCalibration, saveCalibration, type Calibration } from "@/lib/camera/transform";

export type CameraStatus = "idle" | "requesting" | "live" | "denied" | "unavailable";
export type SourceMode = "camera" | "demo";

interface CameraState {
  deviceId: string | null;
  devices: MediaDeviceInfo[];
  resolution: { width: number; height: number } | null;
  status: CameraStatus;
  error: string | null;
  mode: SourceMode;
  calibration: Calibration;
  hydrate: () => void;
  setDevices: (d: MediaDeviceInfo[]) => void;
  setDeviceId: (id: string | null) => void;
  setResolution: (r: { width: number; height: number } | null) => void;
  setStatus: (s: CameraStatus, error?: string | null) => void;
  setMode: (m: SourceMode) => void;
  toggleCalibration: (k: keyof Calibration) => void;
  resetCalibration: () => void;
}

export const useCameraStore = create<CameraState>((set, get) => ({
  deviceId: null,
  devices: [],
  resolution: null,
  status: "idle",
  error: null,
  mode: "demo",
  calibration: DEFAULT_CALIBRATION,
  hydrate: () => set({ calibration: loadCalibration() }),
  setDevices: (devices) => set({ devices }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setResolution: (resolution) => set({ resolution }),
  setStatus: (status, error = null) => set({ status, error }),
  setMode: (mode) => set({ mode }),
  toggleCalibration: (k) => {
    const calibration = { ...get().calibration, [k]: !get().calibration[k] };
    saveCalibration(calibration);
    set({ calibration });
  },
  resetCalibration: () => {
    saveCalibration(DEFAULT_CALIBRATION);
    set({ calibration: DEFAULT_CALIBRATION });
  },
}));
