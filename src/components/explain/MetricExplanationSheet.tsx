"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BookOpen, Sigma, TrendingDown, TrendingUp, Minus, X, Lightbulb } from "lucide-react";
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";
import type { FinancialMetric, Sentiment } from "@/types/finance";

const sentimentStyle: Record<Sentiment, { label: string; cls: string }> = {
  positive: { label: "Constructive", cls: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" },
  negative: { label: "Watch", cls: "bg-rose-400/15 text-rose-300 ring-rose-400/30" },
  neutral: { label: "Neutral", cls: "bg-zinc-400/15 text-zinc-300 ring-zinc-400/30" },
};

function yoy(m: FinancialMetric) {
  const [cur, prev] = m.cells;
  if (!cur || !prev || prev.value === 0) return null;
  return ((cur.value - prev.value) / Math.abs(prev.value)) * 100;
}

function Section({ icon: Icon, title, children, delay }: { icon: typeof BookOpen; title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="space-y-2">
      <h3 className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </motion.section>
  );
}

/** Slide-over explanation card: Definition → Formula/Decomposition → Significance & Red Flags. */
export function MetricExplanationSheet() {
  const page = useDocumentStore((s) => s.page);
  const { selection, sheetOpen, closeSheet } = useInteractionStore();
  const metric = page?.metrics.find((m) => m.id === selection?.metricId);
  const cellIdx = selection?.cellIndex ?? 0;
  const cell = metric?.cells[cellIdx] ?? metric?.cells[0];
  const delta = metric ? yoy(metric) : null;
  const ex = metric?.explanation;

  return (
    <AnimatePresence>
      {sheetOpen && metric && ex && cell && (
        <motion.aside
          id="metric-explanation-sheet"
          key="sheet"
          role="dialog"
          aria-label={`${metric.label} explanation`}
          className="glass-panel absolute bottom-3 right-3 top-3 z-30 flex w-[min(420px,40vw)] flex-col overflow-hidden rounded-3xl"
          initial={{ x: "110%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.6 }}
          onDragEnd={(_, info) => info.offset.x > 120 && closeSheet()}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-400/10 to-transparent" />
          <header className="relative flex items-start justify-between gap-3 px-6 pb-4 pt-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[0.7rem] text-zinc-400">
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono font-semibold text-zinc-200">{page?.ticker}</span>
                <span className="truncate">{page?.docType} · {cell.period}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{metric.label}</h2>
            </div>
            <button id="btn-close-sheet" onClick={closeSheet} aria-label="Close" className="rounded-full bg-white/10 p-2 text-zinc-300 transition hover:bg-white/20 hover:text-white active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="relative flex items-end justify-between gap-4 px-6 pb-5">
            <div>
              <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-white">
                {metric.kind === "per-share" ? cell.display : `$${cell.display}`}
                {metric.kind !== "per-share" && <span className="ml-1 text-base text-zinc-500">M</span>}
              </div>
              {metric.cells[1] && (
                <div className="mt-1 text-xs text-zinc-500">
                  vs {metric.kind === "per-share" ? metric.cells[1].display : `$${metric.cells[1].display}M`} prior year
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {delta !== null && (
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-sm font-semibold ${delta >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                  {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% YoY
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ring-1 ${sentimentStyle[ex.sentiment].cls}`}>
                {sentimentStyle[ex.sentiment].label}
              </span>
            </div>
          </div>

          <div className="relative flex-1 space-y-6 overflow-y-auto border-t border-white/5 px-6 py-5">
            <Section icon={BookOpen} title="What it means" delay={0.08}>
              <p className="text-[0.92rem] leading-relaxed text-zinc-200">{ex.definition}</p>
            </Section>

            <Section icon={Sigma} title="How it's derived" delay={0.14}>
              <div className="rounded-xl bg-black/30 p-3 ring-1 ring-white/5">
                <p className="font-mono text-[0.8rem] text-amber-200/90">{ex.formula}</p>
                {ex.components && (
                  <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
                    {ex.components.map((c, i) => (
                      <div key={i} className={`flex items-center justify-between font-mono text-[0.8rem] tabular-nums ${c.op === "=" ? "border-t border-white/10 pt-1.5 font-semibold text-white" : "text-zinc-300"}`}>
                        <span className="flex items-center gap-2">
                          <span className="w-3 text-center text-zinc-500">{c.op ?? ""}</span>
                          {c.label}
                        </span>
                        <span>{c.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section icon={Lightbulb} title="Why analysts care" delay={0.2}>
              <p className="text-[0.92rem] leading-relaxed text-zinc-200">{ex.significance}</p>
            </Section>

            {ex.redFlags.length > 0 && (
              <Section icon={AlertTriangle} title="Red flags" delay={0.26}>
                <ul className="space-y-2">
                  {ex.redFlags.map((f) => (
                    <li key={f} className="flex gap-2.5 rounded-xl bg-rose-500/[0.07] p-3 text-[0.85rem] leading-snug text-rose-100/90 ring-1 ring-rose-400/15">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
          <footer className="border-t border-white/5 px-6 py-3 text-[0.65rem] text-zinc-500">
            Educational context, not investment advice · Source: {page?.source === "mock" ? "offline fixture" : "vision model"}
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
