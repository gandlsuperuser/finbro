"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X, BrainCircuit, Loader2 } from "lucide-react";
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useQwenStore } from "@/stores/qwenStore";
import type { BBox } from "@/types/finance";

const pct = (n: number) => `${n * 100}%`;

export function ARFloatingCallout() {
  const page = useDocumentStore((s) => s.page);
  const selection = useInteractionStore((s) => s.selection);
  const closeSheet = useInteractionStore((s) => s.closeSheet);
  const select = useInteractionStore((s) => s.select);
  const sheetOpen = useInteractionStore((s) => s.sheetOpen);

  const {
    currentContent,
    currentReasoning,
    isStreaming,
    status,
    showScreenCallout,
  } = useQwenStore();

  const selectedMetric = useMemo(() => {
    if (!page || !selection) return null;
    return page.metrics.find((m) => m.id === selection.metricId) || null;
  }, [page, selection]);

  if (!showScreenCallout || !selection || !selectedMetric) return null;

  const cell =
    selection.cellIndex !== null
      ? selectedMetric.cells[selection.cellIndex]
      : selectedMetric.cells[0];

  const targetBox: BBox =
    selection.cellIndex !== null && cell
      ? cell.bbox
      : selectedMetric.rowBBox;

  // Calculate position: anchor callout near the right edge of target or below
  const [minX, minY, maxX, maxY] = targetBox;
  const centerY = (minY + maxY) / 2;

  // Position callout intelligently to not overflow
  const isRightSide = maxX > 0.65;
  const calloutLeft = isRightSide ? Math.max(0.04, minX - 0.38) : Math.min(0.62, maxX + 0.03);
  const calloutTop = Math.max(0.08, Math.min(0.68, centerY - 0.06));

  // Extract a brief on-screen snippet from currentContent (or summary)
  const displayText = currentContent
    ? currentContent.replace(/^#+.*$/gm, "").trim().slice(0, 220)
    : "";

  return (
    <AnimatePresence>
      <motion.div
        key={`callout-${selectedMetric.id}`}
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 4 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="pointer-events-auto absolute z-30 flex flex-col"
        style={{
          left: pct(calloutLeft),
          top: pct(calloutTop),
          width: "min(340px, 86vw)",
        }}
      >
        {/* AR Floating Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0d0e14]/95 p-4 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.8),0_0_20px_0_rgba(251,191,36,0.15)] backdrop-blur-xl">
          {/* Subtle Cyber Gradient Banner */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-400/20 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                <Sparkles className="h-3 w-3" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold tracking-wide text-zinc-100">
                  {selectedMetric.label}
                </span>
                <span className="text-[0.62rem] text-amber-300/80 font-mono">
                  {cell?.display} {selectedMetric.kind !== "per-share" && "$M"} · Qwen 3.5
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isStreaming && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.6rem] font-medium text-amber-300 animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  生成中
                </span>
              )}
              <button
                onClick={() => {
                  useInteractionStore.setState({ selection: null });
                  closeSheet();
                }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                title="关闭说明"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Thinking indicator if Qwen is reasoning */}
          {isStreaming && currentReasoning && !currentContent && (
            <div className="relative mt-2.5 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[0.68rem] text-zinc-300 border border-white/5">
              <BrainCircuit className="h-3.5 w-3.5 animate-pulse text-amber-300 shrink-0" />
              <span className="truncate italic font-mono text-zinc-400">
                深度思考中: {currentReasoning.slice(-45)}
              </span>
            </div>
          )}

          {/* Screen Explanation Content */}
          <div className="relative mt-2.5 text-[0.76rem] leading-relaxed text-zinc-200">
            {displayText ? (
              <p className="line-clamp-4 whitespace-pre-wrap font-sans text-zinc-300">
                {displayText}
                {isStreaming && <span className="inline-block h-3 w-1.5 ml-1 bg-amber-300 animate-pulse align-middle" />}
              </p>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 py-2 text-zinc-400 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                <span>正在连线 Qwen 3.5 实时解读该数字…</span>
              </div>
            ) : status === "error" ? (
              <p className="text-rose-300 text-xs">解读生成失败，请检查模型服务连接状态。</p>
            ) : (
              <p className="text-zinc-400 text-xs">点击下方按钮展开详细分析报告</p>
            )}
          </div>

          {/* Footer Action */}
          <div className="relative mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
            <span className="text-[0.62rem] text-zinc-400">
              AR 实时屏幕文字批注
            </span>
            <button
              onClick={() => {
                select(selection); // opens sheet
              }}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2.5 py-1 text-[0.68rem] font-medium text-amber-200 hover:text-white hover:bg-amber-400/30 transition border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
            >
              <span>{sheetOpen ? "已展开侧边栏" : "深度研报 & 提问"}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
