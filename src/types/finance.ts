/**
 * All bounding boxes live in *normalized, upright document space*:
 * [minX, minY, maxX, maxY] with 0..1 relative to the displayed (post-transform,
 * post-letterbox) media content rect. This is the single coordinate system shared
 * by the camera frame, the AR HUD, the drawing canvas and the API.
 */
export type BBox = [number, number, number, number];

export type Sentiment = "positive" | "negative" | "neutral";
export type Severity = "info" | "warn" | "risk";

export interface MetricExplanation {
  definition: string;
  formula: string;
  components?: { label: string; value: string; op?: "+" | "−" | "=" | "÷" }[];
  significance: string;
  redFlags: string[];
  sentiment: Sentiment;
}

export interface MetricCell {
  period: string;
  display: string;
  value: number; // in $M (or $ for per-share)
  bbox: BBox;
}

export interface FinancialMetric {
  id: string;
  label: string;
  kind: "row" | "subtotal" | "total" | "per-share";
  indent?: number;
  labelBBox: BBox;
  rowBBox: BBox;
  cells: MetricCell[];
  explanation: MetricExplanation;
}

export interface HudAnnotation {
  id: string;
  metricId?: string;
  bbox: BBox;
  title: string;
  note: string;
  severity: Severity;
  side: "left" | "right";
}

export interface RecognizedPage {
  id: string;
  company: string;
  ticker: string;
  docType: "10-K" | "10-Q" | "Annual Report";
  section: string;
  unitNote: string;
  periods: string[];
  /** width / height of the page frame the bboxes were mapped against */
  aspect: number;
  sectionBBox: BBox;
  metrics: FinancialMetric[];
  annotations: HudAnnotation[];
  confidence: number;
  source: "mock" | "vision";
}

export interface AnalyzePageResponse {
  page: RecognizedPage | null;
  latencyMs: number;
}
