import { create } from "zustand";
import { DEFAULT_CALIBRATION, loadCalibration, saveCalibration, type Calibration } from "@/lib/camera/transform";

export type CameraStatus = "idle" | "requesting" | "live" | "denied" | "unavailable";
export type SourceMode = "camera" | "demo";
export type FacingMode = "user" | "environment";

interface CameraState {
  deviceId: string | null;
  devices: MediaDeviceInfo[];
  resolution: { width: number; height: number } | null;
  status: CameraStatus;
  error: string | null;
  mode: SourceMode;
  facingMode: FacingMode;
  calibration: Calibration;
  hydrate: () => void;
  setDevices: (d: MediaDeviceInfo[]) => void;
  setDeviceId: (id: string | null) => void;
  setResolution: (r: { width: number; height: number } | null) => void;
  setStatus: (s: CameraStatus, error?: string | null) => void;
  setMode: (m: SourceMode) => void;
  setFacingMode: (f: FacingMode) => void;
  toggleFacingMode: () => void;
  toggleRotate180: () => void;
  rotate90: () => void;
  toggleCalibration: (k: "mirrorH" | "mirrorV" | "rotate180") => void;
  resetCalibration: () => void;
}

export const useCameraStore = create<CameraState>((set, get) => ({
  deviceId: null,
  devices: [],
  resolution: null,
  status: "idle",
  error: null,
  mode: "demo",
  facingMode: "user",
  calibration: DEFAULT_CALIBRATION,
  hydrate: () => set({ calibration: loadCalibration() }),
  setDevices: (devices) => set({ devices }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setResolution: (resolution) => set({ resolution }),
  setStatus: (status, error = null) => set({ status, error }),
  setMode: (mode) => set({ mode }),
  setFacingMode: (facingMode) => set({ facingMode, deviceId: null }),
  toggleFacingMode: () =>
    set((s) => ({
      facingMode: s.facingMode === "user" ? "environment" : "user",
      deviceId: null,
    })),
  toggleRotate180: () => {
    const cur = get().calibration;
    const is180 = (cur.rotation ?? (cur.rotate180 ? 180 : 0)) === 180;
    const nextRot = is180 ? 0 : 180;
    const calibration: Calibration = {
      ...cur,
      rotation: nextRot,
      rotate180: nextRot === 180,
    };
    saveCalibration(calibration);
    set({ calibration });
  },
  rotate90: () => {
    const cur = get().calibration;
    const currentRot = cur.rotation ?? (cur.rotate180 ? 180 : 0);
    const nextRot = (currentRot + 90) % 360;
    const calibration: Calibration = {
      ...cur,
      rotation: nextRot,
      rotate180: nextRot === 180,
    };
    saveCalibration(calibration);
    set({ calibration });
  },
  toggleCalibration: (k) => {
    if (k === "rotate180") {
      get().toggleRotate180();
      return;
    }
    const cur = get().calibration;
    const calibration: Calibration = { ...cur, [k]: !cur[k] };
    saveCalibration(calibration);
    set({ calibration });
  },
  resetCalibration: () => {
    saveCalibration(DEFAULT_CALIBRATION);
    set({ calibration: DEFAULT_CALIBRATION });
  },
}));
