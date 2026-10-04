"use client";

import { useEffect, useRef, type RefObject } from "react";
import { captureFrame, lumaDiff, sampleLuma } from "@/lib/camera/frameCapture";
import { useCameraStore } from "@/stores/cameraStore";
import { useDocumentStore } from "@/stores/documentStore";
import type { AnalyzePageResponse } from "@/types/finance";

const SAMPLE_MS = 500;
const MIN_SCAN_INTERVAL_MS = 3500;
const STABLE_DIFF = 5; // mean luma delta considered "still"
const STABLE_FOR_MS = 1000;
const PAGE_CHANGE_DIFF = 16; // vs last analyzed frame → new page / moved

// 1×1 transparent PNG used in demo mode (API only needs a valid data URL)
const DEMO_FRAME =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function analyze(image: string): Promise<AnalyzePageResponse> {
  const r = await fetch("/api/analyze-page", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!r.ok) throw new Error(`analyze-page ${r.status}`);
  return r.json();
}

/**
 * Passive page recognition: samples a tiny luma thumbnail every 500 ms, waits until
 * the page has been still for ~1 s, then sends a full upright frame for analysis —
 * at most once every 3.5 s, and only if the page changed since the last scan.
 */
export function usePageScanner(videoRef: RefObject<HTMLVideoElement | null>) {
  const mode = useCameraStore((s) => s.mode);
  const status = useCameraStore((s) => s.status);
  const inflight = useRef(false);

  useEffect(() => {
    const { setPage, setScanStatus } = useDocumentStore.getState();

    if (mode === "demo") {
      setScanStatus("analyzing");
      const t = setTimeout(() => {
        analyze(DEMO_FRAME)
          .then((r) => setPage(r.page, r.latencyMs))
          .catch(() => setScanStatus("error"));
      }, 900);
      return () => clearTimeout(t);
    }

    if (status !== "live") return;
    setPage(null);
    setScanStatus("waiting-stable");

    let prev: Uint8ClampedArray | null = null;
    let lastAnalyzed: Uint8ClampedArray | null = null;
    let stableSince = 0;
    let lastScan = 0;

    const id = setInterval(async () => {
      const video = videoRef.current;
      if (!video || inflight.current) return;
      const luma = sampleLuma(video);
      if (!luma) return;
      const now = performance.now();
      const moving = prev ? lumaDiff(prev, luma) > STABLE_DIFF : true;
      prev = luma;
      if (moving) {
        stableSince = 0;
        useDocumentStore.getState().setScanStatus("waiting-stable");
        return;
      }
      stableSince ||= now;
      const changed = !lastAnalyzed || lumaDiff(lastAnalyzed, luma) > PAGE_CHANGE_DIFF;
      if (now - stableSince < STABLE_FOR_MS || now - lastScan < MIN_SCAN_INTERVAL_MS || !changed) return;

      const frame = captureFrame(video, useCameraStore.getState().calibration);
      if (!frame) return;
      inflight.current = true;
      lastScan = now;
      lastAnalyzed = luma;
      setScanStatus("analyzing");
      try {
        const r = await analyze(frame);
        setPage(r.page, r.latencyMs);
      } catch {
        setScanStatus("error");
      } finally {
        inflight.current = false;
      }
    }, SAMPLE_MS);

    return () => clearInterval(id);
  }, [mode, status, videoRef]);
}
