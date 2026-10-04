"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { calibrationToCss, containRect, type Rect } from "@/lib/camera/transform";
import { useCameraStore } from "@/stores/cameraStore";
import { useCamera } from "@/hooks/useCamera";
import { DemoDocument } from "./DemoDocument";
import { CameraOff, Loader2 } from "lucide-react";

const DEMO_SIZE = { width: 1440, height: 1080 }; // 4:3, matches fixture LAYOUT.aspect

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Overlays rendered inside the letterbox-corrected stage (HUD, canvas…). */
  children?: (stage: Rect) => ReactNode;
}

/**
 * Renders the camera feed (or demo page) inside a "stage" div whose box equals
 * the object-fit: contain content rect. Every overlay is a child of the stage, so
 * normalized coordinates map 1:1 onto the visible document — no letterbox drift.
 */
export function CameraViewport({ videoRef, children }: Props) {
  useCamera(videoRef);
  const { mode, status, error, resolution, calibration, setMode } = useCameraStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainer({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const media = mode === "camera" && resolution ? resolution : DEMO_SIZE;
  const stage = containRect(container.w, container.h, media.width, media.height);
  const showVideo = mode === "camera";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <div
        className="absolute"
        style={{ left: stage.x, top: stage.y, width: stage.width, height: stage.height }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-fill will-change-transform"
          style={{ transform: calibrationToCss(calibration), display: showVideo ? "block" : "none" }}
        />
        {!showVideo && <DemoDocument />}
        {children?.(stage)}

        {showVideo && status !== "live" && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 backdrop-blur-sm">
            <div className="glass-panel flex max-w-sm flex-col items-center gap-3 rounded-2xl p-6 text-center">
              {status === "requesting" ? (
                <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
              ) : (
                <CameraOff className="h-7 w-7 text-rose-300" />
              )}
              <p className="text-sm text-zinc-200">
                {status === "requesting" ? "Requesting camera…" : status === "denied" ? "Camera permission denied." : "Camera unavailable."}
              </p>
              {error && status !== "requesting" && <p className="text-xs text-zinc-500">{error}</p>}
              {status !== "requesting" && (
                <button id="btn-use-demo" onClick={() => setMode("demo")} className="chip chip-active mt-1">
                  Use demo document
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
