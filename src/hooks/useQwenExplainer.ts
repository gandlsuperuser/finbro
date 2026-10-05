"use client";

import { useCallback, useRef } from "react";
import { useQwenStore } from "@/stores/qwenStore";
import { useDocumentStore } from "@/stores/documentStore";
import type { FinancialMetric, MetricCell } from "@/types/finance";

export function useQwenExplainer() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const requestExplanation = useCallback(
    async (
      metric: FinancialMetric,
      cellIndex: number | null,
      customQuestion?: string
    ) => {
      // Abort any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const {
        endpoint,
        model,
        startExplanation,
        appendReasoning,
        appendContent,
        setStatus,
        setStreaming,
        addMessage,
        threads,
      } = useQwenStore.getState();

      const page = useDocumentStore.getState().page;

      const cell: MetricCell | undefined =
        cellIndex !== null ? metric.cells[cellIndex] : metric.cells[0];

      // Calculate YoY change if we have 2 periods
      let deltaYoY: number | null = null;
      if (metric.cells.length >= 2 && metric.cells[1].value !== 0) {
        deltaYoY =
          ((metric.cells[0].value - metric.cells[1].value) /
            Math.abs(metric.cells[1].value)) *
          100;
      }

      // Collect some neighboring rows for financial context
      const contextRows = page?.metrics
        ?.slice(0, 7)
        .map(
          (m) =>
            `${m.label}: ${m.cells[0]?.display ?? "N/A"} (${m.cells[1]?.display ?? "N/A"})`
        )
        .join("; ");

      startExplanation(metric.id, cellIndex);

      const history = (threads[metric.id] || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: metric.label,
            value: cell?.display,
            unit: metric.kind === "per-share" ? "USD" : "$M",
            period: cell?.period,
            company: page?.company,
            ticker: page?.ticker,
            docType: page?.docType,
            deltaYoY,
            context: contextRows,
            userQuestion: customQuestion,
            history,
            endpoint,
            model,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No readable response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "reasoning") {
                appendReasoning(event.delta);
              } else if (event.type === "content") {
                appendContent(event.delta);
              } else if (event.type === "done") {
                setStreaming(false);
                setStatus("connected");
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch {
              // Partial JSON or heartbeat
            }
          }
        }

        // Save assistant response to conversation thread
        const finalState = useQwenStore.getState();
        if (finalState.currentContent) {
          addMessage(metric.id, {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: finalState.currentContent,
            reasoning: finalState.currentReasoning,
            createdAt: Date.now(),
          });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        useQwenStore.setState({
          status: "error",
          errorMessage: msg,
          isStreaming: false,
        });
      } finally {
        setStreaming(false);
      }
    },
    []
  );

  return { requestExplanation };
}
