"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Sigma,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
  Lightbulb,
  Sparkles,
  BrainCircuit,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
} from "lucide-react";

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useQwenStore, type ChatMessage } from "@/stores/qwenStore";
import { useQwenExplainer } from "@/hooks/useQwenExplainer";
import { FormattedMarkdown } from "@/lib/ui/formatMarkdown";
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

function Section({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-2"
    >
      <h3 className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        <Icon className="h-3.5 w-3.5 text-amber-300" />
        {title}
      </h3>
      {children}
    </motion.section>
  );
}

const QUICK_PROMPTS = [
  "同行对比情况？",
  "为什么增长这么快？",
  "潜在风险或隐患？",
  "未来可持续性如何？",
];

export function MetricExplanationSheet() {
  const page = useDocumentStore((s) => s.page);
  const { selection, sheetOpen, closeSheet } = useInteractionStore();
  const metric = page?.metrics.find((m) => m.id === selection?.metricId);
  const cellIdx = selection?.cellIndex ?? 0;
  const cell = metric?.cells[cellIdx] ?? metric?.cells[0];
  const delta = metric ? yoy(metric) : null;
  const ex = metric?.explanation;

  const [activeTab, setActiveTab] = useState<"ai" | "classic">("ai");
  const [showThinking, setShowThinking] = useState(false);
  const [questionInput, setQuestionInput] = useState("");

  const {
    activeMetricId,
    currentContent,
    currentReasoning,
    isStreaming,
    threads,
  } = useQwenStore();

  const { requestExplanation } = useQwenExplainer();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-request Qwen explanation when a new metric is selected
  useEffect(() => {
    if (!sheetOpen || !metric) return;
    const existingThread = threads[metric.id];
    // Trigger if this metric hasn't been generated yet
    if (activeMetricId !== metric.id && (!existingThread || existingThread.length === 0)) {
      requestExplanation(metric, cellIdx);
    }
  }, [sheetOpen, metric, cellIdx, activeMetricId, threads, requestExplanation]);

  // Scroll to bottom when new chat content arrives
  useEffect(() => {
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentContent, isStreaming]);

  const handleAskQuestion = (q?: string) => {
    const question = q || questionInput.trim();
    if (!question || !metric) return;
    setQuestionInput("");

    useQwenStore.getState().addMessage(metric.id, {
      id: createMessageId("user"),
      role: "user",
      content: question,
      createdAt: 0,
    });

    requestExplanation(metric, cellIdx, question);
  };

  const currentThread: ChatMessage[] = metric ? threads[metric.id] || [] : [];

  return (
    <AnimatePresence>
      {sheetOpen && metric && cell && (
        <motion.aside
          id="metric-explanation-sheet"
          key="sheet"
          role="dialog"
          aria-label={`${metric.label} explanation`}
          className="glass-panel absolute bottom-3 right-3 top-3 z-40 flex w-[min(460px,46vw)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d12]/95 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          initial={{ x: "110%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.6 }}
          onDragEnd={(_, info) => info.offset.x > 120 && closeSheet()}
        >
          {/* Subtle Ambient cyber glow top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-amber-400/15 via-orange-500/5 to-transparent" />

          {/* Header */}
          <header className="relative flex items-start justify-between gap-3 px-6 pb-3 pt-5 border-b border-white/5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[0.7rem] text-zinc-400">
                <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 font-mono font-semibold text-amber-300 border border-amber-400/20">
                  {page?.ticker}
                </span>
                <span className="truncate">
                  {page?.docType} · {cell.period}
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {metric.label}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => metric && requestExplanation(metric, cellIdx)}
                title="重新由 Qwen 3.5 分析"
                className="rounded-full bg-white/5 p-2 text-zinc-300 transition hover:bg-white/15 hover:text-white"
              >
                <RotateCcw className={`h-4 w-4 ${isStreaming ? "animate-spin text-amber-400" : ""}`} />
              </button>
              <button
                id="btn-close-sheet"
                onClick={closeSheet}
                aria-label="Close"
                className="rounded-full bg-white/5 p-2 text-zinc-300 transition hover:bg-white/15 hover:text-white active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Number Spotlight */}
          <div className="relative flex items-end justify-between gap-4 px-6 py-4 bg-white/[0.02]">
            <div>
              <div className="font-mono text-3xl font-bold tabular-nums tracking-tight text-white flex items-baseline">
                {metric.kind === "per-share" ? cell.display : `$${cell.display}`}
                {metric.kind !== "per-share" && <span className="ml-1 text-sm text-zinc-400 font-sans">M</span>}
              </div>
              {metric.cells[1] && (
                <div className="mt-1 text-xs text-zinc-400">
                  前一期同期: {metric.kind === "per-share" ? metric.cells[1].display : `$${metric.cells[1].display}M`}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {delta !== null && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                    delta >= 0 ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/30"
                  }`}
                >
                  {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)}% YoY
                </span>
              )}
              {ex && (
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ring-1 ${sentimentStyle[ex.sentiment].cls}`}>
                  {sentimentStyle[ex.sentiment].label}
                </span>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="relative flex border-b border-white/10 px-6 pt-1 bg-black/20">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 pb-2.5 pt-2 text-xs font-semibold transition border-b-2 ${
                activeTab === "ai"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Qwen 3.5 智能解读
            </button>
            <button
              onClick={() => setActiveTab("classic")}
              className={`ml-5 flex items-center gap-1.5 pb-2.5 pt-2 text-xs font-semibold transition border-b-2 ${
                activeTab === "classic"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              基础定义与公式
            </button>
          </div>

          {/* Main Content Area */}
          <div className="relative flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {activeTab === "ai" ? (
              <div className="space-y-4">
                {/* AI Reasoning / Thinking Accordion */}
                {(currentReasoning || isStreaming) && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                    <button
                      onClick={() => setShowThinking(!showThinking)}
                      className="flex w-full items-center justify-between text-left text-xs font-medium text-amber-300/90"
                    >
                      <span className="flex items-center gap-2">
                        <BrainCircuit className={`h-4 w-4 ${isStreaming ? "animate-pulse text-amber-400" : ""}`} />
                        <span>Qwen 3.5 深度思考过程</span>
                        {isStreaming && (
                          <span className="text-[0.62rem] rounded-full bg-amber-400/20 px-1.5 py-0.2 font-mono">
                            推理计算中…
                          </span>
                        )}
                      </span>
                      {showThinking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showThinking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 max-h-48 overflow-y-auto rounded-lg bg-black/50 p-2.5 font-mono text-[0.72rem] leading-relaxed text-zinc-400 border border-white/5"
                      >
                        <p className="whitespace-pre-wrap">{currentReasoning}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Conversation History / Main Explanation */}
                {currentThread.length === 0 && !currentContent && !isStreaming ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Sparkles className="h-8 w-8 text-amber-400/60 mb-2" />
                    <p className="text-sm text-zinc-300 font-medium">点击生成 Qwen 3.5 财报解读</p>
                    <button
                      onClick={() => metric && requestExplanation(metric, cellIdx)}
                      className="mt-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition"
                    >
                      立即开始智能解读
                    </button>
                  </div>
                ) : null}

                {/* Render History Messages */}
                {currentThread.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "ml-8 bg-white/10 text-zinc-100 border border-white/10"
                        : "mr-2 bg-[#12131a] text-zinc-200 border border-white/5"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-semibold text-zinc-400">
                      {msg.role === "user" ? (
                        <>
                          <User className="h-3 w-3 text-zinc-400" />
                          <span>用户提问</span>
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 text-amber-300" />
                          <span>Qwen 3.5 解读报告</span>
                        </>
                      )}
                    </div>
                    {msg.role === "user" ? (
                      <p className="text-sm text-white font-medium">{msg.content}</p>
                    ) : (
                      <FormattedMarkdown text={msg.content} />
                    )}
                  </div>
                ))}

                {/* Active Streaming Message (if streaming now) */}
                {isStreaming && currentContent && (
                  <div className="mr-2 rounded-2xl bg-[#12131a] p-4 text-xs leading-relaxed text-zinc-200 border border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.06)]">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-semibold text-amber-300">
                      <Bot className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                      <span>Qwen 3.5 实时生成中…</span>
                    </div>
                    <FormattedMarkdown text={currentContent} />
                    <span className="inline-block h-3.5 w-1.5 ml-1 bg-amber-400 animate-pulse align-middle" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* Classic Breakdown Tab */
              ex && (
                <div className="space-y-6">
                  <Section icon={BookOpen} title="指标通俗释义" delay={0.05}>
                    <p className="text-[0.92rem] leading-relaxed text-zinc-200">{ex.definition}</p>
                  </Section>

                  <Section icon={Sigma} title="会计计算公式与拆解" delay={0.1}>
                    <div className="rounded-xl bg-black/40 p-3.5 ring-1 ring-white/10">
                      <p className="font-mono text-[0.82rem] text-amber-200/95 font-semibold">{ex.formula}</p>
                      {ex.components && (
                        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                          {ex.components.map((c, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between font-mono text-[0.8rem] tabular-nums ${
                                c.op === "=" ? "border-t border-white/10 pt-1.5 font-bold text-white" : "text-zinc-300"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-3 text-center text-zinc-500 font-bold">{c.op ?? ""}</span>
                                {c.label}
                              </span>
                              <span>{c.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section icon={Lightbulb} title="分析师为何重视" delay={0.15}>
                    <p className="text-[0.92rem] leading-relaxed text-zinc-200">{ex.significance}</p>
                  </Section>

                  {ex.redFlags.length > 0 && (
                    <Section icon={AlertTriangle} title="风险排查与警示" delay={0.2}>
                      <ul className="space-y-2">
                        {ex.redFlags.map((f) => (
                          <li
                            key={f}
                            className="flex gap-2.5 rounded-xl bg-rose-500/[0.08] p-3 text-[0.85rem] leading-snug text-rose-100/90 ring-1 ring-rose-400/20"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </div>
              )
            )}
          </div>

          {/* Interactive Chat Input (Only on AI Tab) */}
          {activeTab === "ai" && (
            <div className="relative border-t border-white/10 bg-black/40 p-4">
              {/* Quick prompt suggestions */}
              <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleAskQuestion(prompt)}
                    disabled={isStreaming}
                    className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[0.68rem] text-zinc-300 hover:bg-white/10 hover:text-white transition border border-white/5 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  disabled={isStreaming}
                  placeholder="向 Qwen 3.5 提问该指标与数字细节…"
                  className="w-full rounded-2xl bg-white/5 border border-white/10 pl-4 pr-11 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || isStreaming}
                  className="absolute right-1.5 rounded-xl bg-amber-400 p-1.5 text-black hover:bg-amber-300 transition disabled:opacity-30 disabled:hover:bg-amber-400"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Footer Note */}
          <footer className="border-t border-white/5 px-6 py-2.5 text-[0.65rem] text-zinc-500 flex items-center justify-between bg-black/30">
            <span>Powered by 本地 Qwen 3.5 MLX · 金融财报解读</span>
            <span>仅供参考，不构成投资建议</span>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
