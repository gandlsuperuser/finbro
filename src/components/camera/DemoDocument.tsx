"use client";

import { LAYOUT, nvidiaQ3FY26 } from "@/data/fixtures/nvidiaQ3FY26";

const pct = (n: number) => `${n * 100}%`;

/**
 * A simulated "scanned" 10-Q page rendered from the fixture's own bboxes, so the
 * offline experience is pixel-aligned with the mock analysis results.
 * Font sizes use container query units (cqw) to scale with the stage.
 */
export function DemoDocument() {
  const page = nvidiaQ3FY26;
  return (
    <div
      className="paper absolute inset-0 select-none overflow-hidden text-[#1b1b1f]"
      style={{ containerType: "size", fontFamily: "var(--font-serif-doc)" }}
      aria-label="Demo financial statement"
    >
      <div className="absolute text-center" style={{ left: "5%", right: "5%", top: "4.5%" }}>
        <div style={{ fontSize: "1.55cqw", letterSpacing: "0.08em" }} className="font-semibold uppercase">
          {page.company}
        </div>
        <div style={{ fontSize: "1.9cqw" }} className="mt-[0.3cqw] font-bold">
          {page.section}
        </div>
        <div style={{ fontSize: "1.15cqw" }} className="mt-[0.3cqw] italic text-[#444]">
          {page.unitNote}
        </div>
      </div>

      {page.periods.map((p, i) => (
        <div
          key={p}
          className="absolute border-b border-[#1b1b1f] pb-[0.3cqw] text-right font-semibold"
          style={{
            left: pct(LAYOUT.cols[i][0]),
            width: pct(LAYOUT.cols[i][1] - LAYOUT.cols[i][0]),
            top: pct(LAYOUT.tableTop - 0.05),
            fontSize: "1.2cqw",
          }}
        >
          {p}
        </div>
      ))}

      {page.metrics.map((m) => {
        const [, y0, , y1] = m.rowBBox;
        const strong = m.kind === "total" || m.kind === "subtotal";
        return (
          <div key={m.id}>
            <div
              className="absolute flex items-end"
              style={{
                left: pct(m.labelBBox[0]),
                top: pct(y0),
                height: pct(y1 - y0),
                fontSize: "1.45cqw",
                fontWeight: strong ? 700 : 400,
              }}
            >
              {m.label}
            </div>
            {m.cells.map((c, i) => (
              <div
                key={i}
                className="absolute flex items-end justify-end tabular-nums"
                style={{
                  left: pct(c.bbox[0]),
                  width: pct(c.bbox[2] - c.bbox[0]),
                  top: pct(y0),
                  height: pct(y1 - y0),
                  fontSize: "1.45cqw",
                  fontWeight: strong ? 700 : 400,
                  borderTop: strong ? "1px solid #1b1b1f" : undefined,
                  borderBottom: m.kind === "total" && m.id === "net-income" ? "3px double #1b1b1f" : undefined,
                }}
              >
                {(m.kind === "total" || m.kind === "per-share") && !c.display.startsWith("$") ? "$ " : ""}
                {c.display}
              </div>
            ))}
          </div>
        );
      })}

      <div className="absolute text-[#555]" style={{ right: "5%", bottom: "3%", fontSize: "0.95cqw" }}>
        3
      </div>
    </div>
  );
}
