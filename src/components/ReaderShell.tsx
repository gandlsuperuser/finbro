"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CameraViewport } from "@/components/camera/CameraViewport";
import { AnnotationCanvas } from "@/components/annotation/AnnotationCanvas";
import { ARHudOverlay } from "@/components/hud/ARHudOverlay";
import { MetricExplanationSheet } from "@/components/explain/MetricExplanationSheet";
import { TopBar } from "@/components/chrome/TopBar";
import { usePageScanner } from "@/hooks/usePageScanner";
import { useCameraStore } from "@/stores/cameraStore";
import { useInteractionStore } from "@/stores/interactionStore";

export function ReaderShell() {
  const videoRef = useRef<HTMLVideoElement>(null);
  usePageScanner(videoRef);
  const toast = useInteractionStore((s) => s.toast);

  useEffect(() => useCameraStore.getState().hydrate(), []);

  return (
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-[#050608] text-zinc-100">
      <TopBar />
      <div className="relative flex-1">
        <CameraViewport videoRef={videoRef}>
          {(stage) => (
            <>
              <ARHudOverlay />
              <AnnotationCanvas stage={stage} />
            </>
          )}
        </CameraViewport>

        <MetricExplanationSheet />

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-panel pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-zinc-100"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
