"use client";

import { useCallback, useEffect, useRef } from "react";
import { clientToDoc, type Rect } from "@/lib/camera/transform";
import { classifyStroke, hitTest, strokeBBox, type Stroke } from "@/lib/gesture/strokes";
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";

interface Props {
  stage: Rect;
}

const INK = "rgba(255, 196, 77, 0.95)";
const GLOW = "rgba(255, 170, 40, 0.55)";

/**
 * Low-latency ink layer. Uses Pointer Events + getCoalescedEvents (120 Hz Pencil
 * samples), draws incremental segments synchronously, and stores points in
 * normalized document space so strokes survive resizes / rotation.
 * Palm rejection: once a pen is seen, touch input no longer inks (but still taps).
 */
export function AnnotationCanvas({ stage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useRef<{ id: number; stroke: Stroke; type: string } | null>(null);
  const penSeen = useRef(false);
  const strokes = useInteractionStore((s) => s.strokes);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  const styleCtx = (c: CanvasRenderingContext2D) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = INK;
    c.shadowColor = GLOW;
    c.shadowBlur = 8;
  };

  const drawSegment = useCallback(
    (c: CanvasRenderingContext2D, a: Stroke[number], b: Stroke[number]) => {
      c.lineWidth = 1.6 + 3.2 * (b.p || 0.5);
      c.beginPath();
      c.moveTo(a.x * stage.width, a.y * stage.height);
      c.lineTo(b.x * stage.width, b.y * stage.height);
      c.stroke();
    },
    [stage.width, stage.height],
  );

  // Resize backing store (DPR-aware) and repaint persisted strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(stage.width * dpr);
    canvas.height = Math.round(stage.height * dpr);
    const c = canvas.getContext("2d", { desynchronized: true } as CanvasRenderingContext2DSettings)!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, stage.width, stage.height);
    styleCtx(c);
    for (const s of strokes) for (let i = 1; i < s.length; i++) drawSegment(c, s[i - 1], s[i]);
  }, [stage.width, stage.height, strokes, drawSegment]);

  const toPoint = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x, y } = clientToDoc(e.clientX, e.clientY, rect);
    return { x, y, p: e.pointerType === "pen" ? e.pressure : 0.5, t: e.timeStamp };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "pen") penSeen.current = true;
    if (active.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { id: e.pointerId, stroke: [toPoint(e)], type: e.pointerType };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    const inks = !(a.type === "touch" && penSeen.current);
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const c = ctx();
    for (const ev of events) {
      const pt = toPoint(ev);
      const prev = a.stroke[a.stroke.length - 1];
      a.stroke.push(pt);
      if (inks && c) drawSegment(c, prev, pt);
    }
  };

  const finish = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    active.current = null;
    const { page } = useDocumentStore.getState();
    const { addStroke, clearStrokes, select, showToast } = useInteractionStore.getState();
    const stroke = a.stroke;
    const bbox = strokeBBox(stroke);
    const isTap = bbox[2] - bbox[0] < 0.012 && bbox[3] - bbox[1] < 0.012;
    const kind = isTap ? "none" : classifyStroke(stroke, stage.width / stage.height);

    if (!page) {
      clearStrokes();
      showToast("Hold the page steady — still recognizing…");
      return;
    }
    if (isTap) {
      const p = stroke[0];
      const hit = hitTest([p.x - 0.01, p.y - 0.01, p.x + 0.01, p.y + 0.01], page.metrics, "circle");
      clearStrokes();
      if (hit) select({ metricId: hit.metric.id, cellIndex: hit.cellIndex, bbox: hit.cellIndex === null ? hit.metric.rowBBox : hit.metric.cells[hit.cellIndex].bbox });
      return;
    }
    addStroke(stroke);
    if (kind === "none") {
      showToast("Circle a number or underline a row to explain it");
      setTimeout(() => useInteractionStore.getState().clearStrokes(), 600);
      return;
    }
    const hit = hitTest(bbox, page.metrics, kind);
    if (!hit) {
      showToast("No financial line item found there");
      setTimeout(() => useInteractionStore.getState().clearStrokes(), 600);
      return;
    }
    select({ metricId: hit.metric.id, cellIndex: hit.cellIndex, bbox });
  };

  return (
    <canvas
      id="annotation-canvas"
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      style={{ touchAction: "none", WebkitUserSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={(e) => {
        active.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    />
  );
}
