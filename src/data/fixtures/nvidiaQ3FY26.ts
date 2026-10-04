import type { BBox, FinancialMetric, HudAnnotation, MetricExplanation, RecognizedPage } from "@/types/finance";

/**
 * Layout grid for the simulated scanned page (normalized, upright, aspect 4:3 —
 * matching a typical 4:3 iPad camera frame). The DemoDocument component renders
 * the page with exactly these numbers, so boxes line up 1:1.
 */
export const LAYOUT = {
  aspect: 4 / 3,
  tableTop: 0.255,
  rowH: 0.0505,
  label: [0.07, 0.55] as const,
  cols: [
    [0.6, 0.76],
    [0.8, 0.95],
  ] as const,
};

interface RowSpec {
  id: string;
  label: string;
  kind: FinancialMetric["kind"];
  indent?: number;
  values: [number, number];
  perShare?: boolean;
  explanation: MetricExplanation;
  gapBefore?: number; // extra rows of spacing
}

const PERIODS = ["Oct 26, 2025", "Oct 27, 2024"];

const fmt = (v: number, perShare?: boolean) => {
  const abs = perShare ? Math.abs(v).toFixed(2) : Math.abs(v).toLocaleString("en-US");
  const s = perShare ? `$${abs}` : abs;
  return v < 0 ? `(${s})` : s;
};

export function buildMetrics(rows: RowSpec[]): FinancialMetric[] {
  let cursor = 0;
  return rows.map((r) => {
    cursor += r.gapBefore ?? 0;
    const y0 = LAYOUT.tableTop + cursor * LAYOUT.rowH;
    const y1 = y0 + LAYOUT.rowH * 0.86;
    cursor += 1;
    const labelX = LAYOUT.label[0] + (r.indent ?? 0) * 0.025;
    const labelBBox: BBox = [labelX, y0, LAYOUT.label[1], y1];
    return {
      id: r.id,
      label: r.label,
      kind: r.kind,
      indent: r.indent,
      labelBBox,
      rowBBox: [LAYOUT.label[0], y0, LAYOUT.cols[1][1], y1],
      cells: r.values.map((v, i) => ({
        period: PERIODS[i],
        value: v,
        display: fmt(v, r.perShare),
        bbox: [LAYOUT.cols[i][0], y0, LAYOUT.cols[i][1], y1] as BBox,
      })),
      explanation: r.explanation,
    };
  });
}

const rows: RowSpec[] = [
  {
    id: "revenue",
    label: "Revenue",
    kind: "total",
    values: [57006, 35082],
    explanation: {
      definition:
        "Total sales recognized in the quarter — the 'top line'. For NVIDIA, ~90% now comes from the Data Center segment (GPUs, networking, systems sold to hyperscalers and AI labs).",
      formula: "Data Center + Gaming + Pro Visualization + Automotive + OEM & Other",
      components: [
        { label: "Data Center", value: "51,215" },
        { label: "Gaming", value: "4,265", op: "+" },
        { label: "Pro Vis + Auto + OEM", value: "1,526", op: "+" },
        { label: "Revenue", value: "57,006", op: "=" },
      ],
      significance:
        "Revenue grew +62.5% YoY and +22% QoQ. At this scale, a 60%+ growth rate is extraordinary and is driven by Blackwell system ramps.",
      redFlags: [
        "Customer concentration: a handful of hyperscalers drive a majority of Data Center demand.",
        "Export restrictions (China H20) can remove revenue abruptly.",
      ],
      sentiment: "positive",
    },
  },
  {
    id: "cogs",
    label: "Cost of revenue",
    kind: "row",
    indent: 1,
    values: [15157, 8926],
    explanation: {
      definition:
        "Direct costs to produce what was sold: wafers from TSMC, HBM memory, packaging (CoWoS), assembly, warranty and inventory provisions.",
      formula: "Revenue − Gross profit",
      components: [
        { label: "Revenue", value: "57,006" },
        { label: "Gross profit", value: "41,849", op: "−" },
        { label: "Cost of revenue", value: "15,157", op: "=" },
      ],
      significance:
        "Cost of revenue rose +69.8% YoY — faster than revenue (+62.5%). Rack-scale Blackwell systems carry more third-party content (memory, networking, chassis) than standalone chips.",
      redFlags: ["Costs growing faster than sales compresses gross margin — watch inventory write-downs."],
      sentiment: "negative",
    },
  },
  {
    id: "gross-profit",
    label: "Gross profit",
    kind: "subtotal",
    values: [41849, 26156],
    explanation: {
      definition: "What remains after paying for the product itself. Gross margin = Gross profit ÷ Revenue.",
      formula: "Revenue − Cost of revenue",
      components: [
        { label: "Revenue", value: "57,006" },
        { label: "Cost of revenue", value: "15,157", op: "−" },
        { label: "Gross profit", value: "41,849", op: "=" },
        { label: "Gross margin", value: "73.4%", op: "÷" },
      ],
      significance:
        "Gross margin was 73.4% vs 74.6% a year ago — down ~120 bps YoY, as the mix shifts to full Blackwell racks. Still among the highest in hardware.",
      redFlags: ["Sustained margin slide below ~72% would signal pricing pressure or yield issues."],
      sentiment: "neutral",
    },
  },
  {
    id: "rnd",
    label: "Research and development",
    kind: "row",
    indent: 1,
    gapBefore: 0.4,
    values: [4705, 3390],
    explanation: {
      definition: "Spending on engineering new chips, CUDA software, networking and systems. Expensed as incurred under US GAAP.",
      formula: "Engineering headcount + stock-based comp + tape-outs + compute",
      significance:
        "R&D rose +38.8% YoY but fell to 8.3% of revenue (from 9.7%) — strong operating leverage. A large share is stock-based compensation (~$1.2B/qtr company-wide).",
      redFlags: ["SBC is a real cost to shareholders via dilution, even though it's non-cash."],
      sentiment: "positive",
    },
  },
  {
    id: "sga",
    label: "Sales, general and administrative",
    kind: "row",
    indent: 1,
    values: [1134, 897],
    explanation: {
      definition: "Overhead: sales teams, marketing, executive, legal, finance and facilities costs.",
      formula: "Selling + General + Administrative expenses",
      significance: "SG&A is just 2.0% of revenue — NVIDIA sells to a concentrated customer base, so selling costs stay tiny.",
      redFlags: [],
      sentiment: "positive",
    },
  },
  {
    id: "opex",
    label: "Total operating expenses",
    kind: "subtotal",
    values: [5839, 4287],
    explanation: {
      definition: "All recurring costs to run the business that are not directly tied to producing the product.",
      formula: "R&D + SG&A",
      components: [
        { label: "R&D", value: "4,705" },
        { label: "SG&A", value: "1,134", op: "+" },
        { label: "Total opex", value: "5,839", op: "=" },
      ],
      significance: "Opex grew +36.2% vs revenue +62.5% — every incremental revenue dollar drops largely to operating profit.",
      redFlags: [],
      sentiment: "positive",
    },
  },
  {
    id: "operating-income",
    label: "Operating income",
    kind: "total",
    values: [36010, 21869],
    explanation: {
      definition: "Profit from core operations before interest and taxes (≈ EBIT). Operating margin = Operating income ÷ Revenue.",
      formula: "Gross profit − Total operating expenses",
      components: [
        { label: "Gross profit", value: "41,849" },
        { label: "Total opex", value: "5,839", op: "−" },
        { label: "Operating income", value: "36,010", op: "=" },
        { label: "Operating margin", value: "63.2%", op: "÷" },
      ],
      significance:
        "Operating margin expanded to 63.2% from 62.3% (+90 bps YoY) despite lower gross margin — operating leverage more than offset mix.",
      redFlags: [],
      sentiment: "positive",
    },
  },
  {
    id: "interest-income",
    label: "Interest income",
    kind: "row",
    indent: 1,
    gapBefore: 0.4,
    values: [624, 472],
    explanation: {
      definition: "Interest earned on cash, equivalents and marketable securities (~$60B balance).",
      formula: "Avg. cash & securities × yield",
      significance: "Non-operating; rises with the cash pile and short-term rates.",
      redFlags: ["Falls as rates are cut — don't extrapolate."],
      sentiment: "neutral",
    },
  },
  {
    id: "interest-expense",
    label: "Interest expense",
    kind: "row",
    indent: 1,
    values: [-61, -61],
    explanation: {
      definition: "Interest owed on NVIDIA's ~$8.5B of senior notes. Shown in parentheses because it reduces income.",
      formula: "Debt principal × coupon",
      significance: "Negligible vs $36B operating income — interest coverage > 500×.",
      redFlags: [],
      sentiment: "neutral",
    },
  },
  {
    id: "other-income",
    label: "Other income (expense), net",
    kind: "row",
    indent: 1,
    values: [1939, 447],
    explanation: {
      definition: "Gains/losses on non-marketable and publicly-held equity investments (e.g., stakes in AI startups), plus FX.",
      formula: "Realized + unrealized investment gains − losses",
      significance: "Jumped 4.3× YoY to $1.9B — mark-to-market gains on strategic investments. This is low-quality, non-recurring income.",
      redFlags: ["Strip this out when valuing the core business; it can reverse in a down market."],
      sentiment: "negative",
    },
  },
  {
    id: "pretax",
    label: "Income before income tax",
    kind: "subtotal",
    values: [38512, 22727],
    explanation: {
      definition: "Profit after all operating and non-operating items, before tax.",
      formula: "Operating income + Interest income − Interest expense + Other, net",
      components: [
        { label: "Operating income", value: "36,010" },
        { label: "Net non-operating", value: "2,502", op: "+" },
        { label: "Pre-tax income", value: "38,512", op: "=" },
      ],
      significance: "6.5% of pre-tax income now comes from non-operating items vs 3.8% last year.",
      redFlags: [],
      sentiment: "neutral",
    },
  },
  {
    id: "tax",
    label: "Income tax expense",
    kind: "row",
    indent: 1,
    values: [6602, 3418],
    explanation: {
      definition: "Current and deferred income taxes. Effective tax rate = Tax ÷ Pre-tax income.",
      formula: "Pre-tax income × effective tax rate",
      components: [
        { label: "Tax expense", value: "6,602" },
        { label: "Pre-tax income", value: "38,512", op: "÷" },
        { label: "Effective rate", value: "17.1%", op: "=" },
      ],
      significance: "Effective rate rose to 17.1% from 15.0% — less benefit from stock-comp deductions and FDII.",
      redFlags: ["Global minimum tax (Pillar Two) may push the rate higher over time."],
      sentiment: "negative",
    },
  },
  {
    id: "net-income",
    label: "Net income",
    kind: "total",
    values: [31910, 19309],
    explanation: {
      definition: "The 'bottom line' — profit attributable to shareholders after every expense and tax.",
      formula: "Pre-tax income − Income tax expense",
      components: [
        { label: "Pre-tax income", value: "38,512" },
        { label: "Income tax", value: "6,602", op: "−" },
        { label: "Net income", value: "31,910", op: "=" },
      ],
      significance: "Net income +65.3% YoY, a 56.0% net margin. Roughly $1.3B of it is investment gains rather than operations.",
      redFlags: ["Compare with operating cash flow to verify earnings quality."],
      sentiment: "positive",
    },
  },
  {
    id: "eps-diluted",
    label: "Net income per share — Diluted",
    kind: "per-share",
    gapBefore: 0.4,
    perShare: true,
    values: [1.3, 0.78],
    explanation: {
      definition:
        "Net income divided by weighted-average shares including the effect of options, RSUs and convertibles. The EPS figure Wall Street quotes.",
      formula: "Net income ÷ Diluted weighted-average shares",
      components: [
        { label: "Net income", value: "$31,910M" },
        { label: "Diluted shares", value: "24,551M", op: "÷" },
        { label: "Diluted EPS", value: "$1.30", op: "=" },
      ],
      significance: "Diluted EPS +66.7% YoY — slightly faster than net income because buybacks reduced the share count.",
      redFlags: ["Buybacks partly offset SBC dilution; check the net share count change."],
      sentiment: "positive",
    },
  },
];

const metrics = buildMetrics(rows);
const m = (id: string) => metrics.find((x) => x.id === id)!;

const annotations: HudAnnotation[] = [
  {
    id: "a-rev",
    metricId: "revenue",
    bbox: m("revenue").cells[0].bbox,
    title: "+62.5% YoY",
    note: "Blackwell ramp; Data Center = 90% of sales",
    severity: "info",
    side: "right",
  },
  {
    id: "a-gm",
    metricId: "gross-profit",
    bbox: m("gross-profit").rowBBox,
    title: "GM 73.4%  ▼120 bps",
    note: "Rack-scale mix carries more pass-through cost",
    severity: "warn",
    side: "left",
  },
  {
    id: "a-other",
    metricId: "other-income",
    bbox: m("other-income").cells[0].bbox,
    title: "4.3× YoY — non-core",
    note: "Mark-to-market gains on equity stakes",
    severity: "risk",
    side: "right",
  },
  {
    id: "a-op",
    metricId: "operating-income",
    bbox: m("operating-income").rowBBox,
    title: "Op margin 63.2%  ▲90 bps",
    note: "Opex +36% vs revenue +62%",
    severity: "info",
    side: "left",
  },
  {
    id: "a-tax",
    metricId: "tax",
    bbox: m("tax").cells[0].bbox,
    title: "ETR 17.1% (was 15.0%)",
    note: "Lower SBC tax benefit",
    severity: "warn",
    side: "right",
  },
];

export const nvidiaQ3FY26: RecognizedPage = {
  id: "nvda-10q-q3fy26-income",
  company: "NVIDIA Corporation",
  ticker: "NVDA",
  docType: "10-Q",
  section: "Condensed Consolidated Statements of Income",
  unitNote: "(In millions, except per share data) (Unaudited) — Three Months Ended",
  periods: PERIODS,
  aspect: LAYOUT.aspect,
  sectionBBox: [0.05, 0.05, 0.96, 0.97],
  metrics,
  annotations,
  confidence: 0.97,
  source: "mock",
};
