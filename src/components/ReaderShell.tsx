"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PenLine } from "lucide-react";
import { CameraViewport } from "@/components/camera/CameraViewport";
import { AnnotationCanvas } from "@/components/annotation/AnnotationCanvas";
import { ARHudOverlay } from "@/components/hud/ARHudOverlay";
import { MetricExplanationSheet } from "@/components/explain/MetricExplanationSheet";
import { TopBar } from "@/components/chrome/TopBar";
import { usePageScanner } from "@/hooks/usePageScanner";
import { useCameraStore } from "@/stores/cameraStore";
import { useInteractionStore } from "@/stores/interactionStore";
import { useDocumentStore } from "@/stores/documentStore";

export function ReaderShell() {
  const videoRef = useRef<HTMLVideoElement>(null);
  usePageScanner(videoRef);
  const toast = useInteractionStore((s) => s.toast);
  const recognized = useDocumentStore((s) => s.scanStatus === "recognized");

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
          {recognized && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.8 }}
              className="hud-chip pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 !px-3 !py-2 text-xs"
            >
              <PenLine className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-zinc-300">Circle any number, or underline a row, to explain it</span>
            </motion.div>
          )}
        </AnimatePresence>

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
