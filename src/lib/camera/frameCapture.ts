import { applyCalibrationToCtx, type Calibration } from "./transform";

/** Grab an upright JPEG frame (same orientation the user sees) as base64 data URL. */
export function captureFrame(
  video: HTMLVideoElement,
  calibration: Calibration,
  maxWidth = 1280,
  quality = 0.72,
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, maxWidth / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  applyCalibrationToCtx(ctx, calibration, w, h);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const SAMPLE_W = 48;
const SAMPLE_H = 36;
let sampleCanvas: HTMLCanvasElement | null = null;

/** Tiny grayscale thumbnail used for motion / stability detection. */
export function sampleLuma(video: HTMLVideoElement): Uint8ClampedArray | null {
  if (!video.videoWidth) return null;
  sampleCanvas ??= Object.assign(document.createElement("canvas"), {
    width: SAMPLE_W,
    height: SAMPLE_H,
  });
  const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
  const luma = new Uint8ClampedArray(SAMPLE_W * SAMPLE_H);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    luma[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }
  return luma;
}

/** Mean absolute luma difference, 0..255. */
export function lumaDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}
