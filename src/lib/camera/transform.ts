export interface Calibration {
  rotation: number; // 0, 90, 180, 270 degrees
  rotate180: boolean;
  mirrorH: boolean;
  mirrorV: boolean;
}

export const DEFAULT_CALIBRATION: Calibration = {
  rotation: 180, // periscope mirror delivers the feed upside-down; 180° makes it upright
  rotate180: true,
  mirrorH: false,
  mirrorV: false,
};

/** CSS transform applied to the <video> so the document reads upright. GPU-composited. */
export function calibrationToCss(c: Calibration): string {
  const rot = typeof c.rotation === "number" ? c.rotation : c.rotate180 ? 180 : 0;
  const parts: string[] = [];
  if (rot !== 0) parts.push(`rotate(${rot}deg)`);
  if (c.mirrorH && c.mirrorV) {
    parts.push("scale(-1, -1)");
  } else if (c.mirrorH) {
    parts.push("scaleX(-1)");
  } else if (c.mirrorV) {
    parts.push("scaleY(-1)");
  }
  return parts.length ? parts.join(" ") : "none";
}

/** Same transform for a 2D canvas (used when grabbing frames for analysis). */
export function applyCalibrationToCtx(
  ctx: CanvasRenderingContext2D,
  c: Calibration,
  w: number,
  h: number,
) {
  const rot = typeof c.rotation === "number" ? c.rotation : c.rotate180 ? 180 : 0;
  ctx.translate(w / 2, h / 2);
  if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(c.mirrorH ? -1 : 1, c.mirrorV ? -1 : 1);
  ctx.translate(-w / 2, -h / 2);
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Content rect of media rendered with `object-fit: contain` inside a container. */
export function containRect(
  containerW: number,
  containerH: number,
  mediaW: number,
  mediaH: number,
): Rect {
  if (!mediaW || !mediaH) return { x: 0, y: 0, width: containerW, height: containerH };
  const scale = Math.min(containerW / mediaW, containerH / mediaH);
  const width = mediaW * scale;
  const height = mediaH * scale;
  return { x: (containerW - width) / 2, y: (containerH - height) / 2, width, height };
}

/** Client (pointer) coordinates → normalized upright document coordinates. */
export function clientToDoc(clientX: number, clientY: number, content: DOMRect | Rect) {
  const left = "left" in content ? content.left : content.x;
  const top = "top" in content ? content.top : content.y;
  return {
    x: (clientX - left) / content.width,
    y: (clientY - top) / content.height,
  };
}

const STORAGE_KEY = "finbro.calibration.v2";

export function loadCalibration(): Calibration {
  if (typeof window === "undefined") return DEFAULT_CALIBRATION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) } : DEFAULT_CALIBRATION;
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

export function saveCalibration(c: Calibration) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* private mode – ignore */
  }
}
