import type { BBox, FinancialMetric } from "@/types/finance";

export interface StrokePoint {
  x: number; // normalized doc space
  y: number;
  p: number; // pressure
  t: number;
}

export type Stroke = StrokePoint[];

export function strokeBBox(stroke: Stroke): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { x, y } of stroke) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function pathLength(stroke: Stroke, aspect: number) {
  let len = 0;
  for (let i = 1; i < stroke.length; i++) {
    len += Math.hypot((stroke[i].x - stroke[i - 1].x) * aspect, stroke[i].y - stroke[i - 1].y);
  }
  return len;
}

export type GestureKind = "circle" | "underline" | "none";

/**
 * Classifies a stroke. `aspect` = content width/height so distances are isotropic.
 * - circle: start/end gap small relative to the stroke's size and enough winding
 * - underline: long, flat horizontal stroke (selects the row just above it)
 */
export function classifyStroke(stroke: Stroke, aspect: number): GestureKind {
  if (stroke.length < 6) return "none";
  const [minX, minY, maxX, maxY] = strokeBBox(stroke);
  const w = (maxX - minX) * aspect;
  const h = maxY - minY;
  const diag = Math.hypot(w, h);
  if (diag < 0.015) return "none";

  const first = stroke[0];
  const last = stroke[stroke.length - 1];
  const gap = Math.hypot((last.x - first.x) * aspect, last.y - first.y);
  const len = pathLength(stroke, aspect);

  if (gap < diag * 0.35 && len > diag * 1.8 && h > 0.008) return "circle";
  if (w > 0.05 && h < w * 0.22) return "underline";
  return "none";
}

function area(b: BBox) {
  return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
}

function intersection(a: BBox, b: BBox) {
  return area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
}

export interface HitResult {
  metric: FinancialMetric;
  cellIndex: number | null; // null = label / whole row
  score: number;
}

/**
 * Picks the best metric for a selection box. A target scores by how much of it is
 * covered by the selection (so circling a single number wins over the full row).
 */
export function hitTest(selection: BBox, metrics: FinancialMetric[], kind: GestureKind): HitResult | null {
  let sel = selection;
  if (kind === "underline") {
    const rowH = 0.04;
    sel = [selection[0], selection[1] - rowH, selection[2], selection[1] + 0.005];
  }
  let best: HitResult | null = null;
  for (const metric of metrics) {
    const targets: { box: BBox; cell: number | null }[] = [
      { box: metric.labelBBox, cell: null },
      ...metric.cells.map((c, i) => ({ box: c.bbox, cell: i })),
    ];
    for (const { box, cell } of targets) {
      const inter = intersection(sel, box);
      if (!inter) continue;
      const coverage = inter / area(box);
      const precision = inter / Math.max(area(sel), 1e-6);
      const score = coverage * 0.7 + precision * 0.3;
      if (!best || score > best.score) best = { metric, cellIndex: cell, score };
    }
  }
  return best && best.score > 0.12 ? best : null;
}
