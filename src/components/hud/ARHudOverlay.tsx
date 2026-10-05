"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { ARFloatingCallout } from "./ARFloatingCallout";
import type { BBox, Severity } from "@/types/finance";

const pct = (n: number) => `${n * 100}%`;
const TAG_RIGHT_EDGE = 0.585; // tags live in the whitespace between labels and numbers

const tone: Record<Severity, { ring: string; band: string; dot: string; text: string }> = {
  info: { ring: "rgba(94,234,212,0.85)", band: "rgba(45,212,191,0.10)", dot: "bg-teal-300", text: "text-teal-200" },
  warn: { ring: "rgba(252,211,77,0.9)", band: "rgba(251,191,36,0.12)", dot: "bg-amber-300", text: "text-amber-200" },
  risk: { ring: "rgba(253,164,175,0.9)", band: "rgba(244,63,94,0.12)", dot: "bg-rose-300", text: "text-rose-200" },
};

function boxStyle(b: BBox, pad = 0.004) {
  return {
    left: pct(b[0] - pad),
    top: pct(b[1] - pad),
    width: pct(b[2] - b[0] + pad * 2),
    height: pct(b[3] - b[1] + pad * 2),
  };
}

/** Passive AR layer: section anchor, translucent highlight bands, marginalia tags. */
export function ARHudOverlay() {
  const page = useDocumentStore((s) => s.page);
  const hudVisible = useDocumentStore((s) => s.hudVisible);
  const selection = useInteractionStore((s) => s.selection);

  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence>
        {page && hudVisible && (
          <motion.div key={page.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Section anchor: corner brackets around the recognized statement */}
            <div className="absolute" style={boxStyle(page.sectionBBox, 0)}>
              {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
                <motion.span
                  key={c}
                  className={`absolute h-6 w-6 border-teal-400/80 ${c}`}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                />
              ))}
              <motion.div
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="hud-chip absolute -top-3 left-8 flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
                <span className="font-semibold text-white">{page.ticker}</span>
                <span className="text-zinc-400">{page.docType}</span>
                <span className="text-zinc-300">· Income Statement</span>
                <span className="text-zinc-500">{Math.round(page.confidence * 100)}%</span>
              </motion.div>
            </div>

            {page.annotations.map((a, i) => {
              const t = tone[a.severity];
              const cy = (a.bbox[1] + a.bbox[3]) / 2;
              return (
                <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.09 }}>
                  <div
                    className="absolute rounded-[3px]"
                    style={{ ...boxStyle(a.bbox), background: t.band, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
                  />
                  <motion.div
                    className="absolute flex -translate-x-full -translate-y-1/2 items-center"
                    style={{ left: pct(TAG_RIGHT_EDGE), top: pct(cy) }}
                    initial={{ x: 12 }}
                    animate={{ x: 0 }}
                    transition={{ delay: 0.25 + i * 0.09, type: "spring", stiffness: 300, damping: 26 }}
                  >
                    <div className="hud-chip flex flex-col items-end leading-tight">
                      <span className={`flex items-center gap-1.5 font-semibold ${t.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                        {a.title}
                      </span>
                      <span className="text-[0.62rem] text-zinc-400">{a.note}</span>
                    </div>
                    <span className="h-px w-3" style={{ background: t.ring }} />
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selection && page && (() => {
          const m = page.metrics.find((x) => x.id === selection.metricId);
          if (!m) return null;
          const target = selection.cellIndex === null ? m.rowBBox : m.cells[selection.cellIndex]?.bbox ?? m.rowBBox;
          return (
            <motion.div
              key={`${m.id}-${selection.cellIndex}`}
              className="selection-glow absolute rounded-md"
              style={boxStyle(target, 0.006)}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
            />
          );
        })()}
      </AnimatePresence>

      <ARFloatingCallout />
    </div>
  );
}
