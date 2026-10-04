"use client";

import { motion } from "framer-motion";
import { Camera, Eraser, FileText, FlipHorizontal2, FlipVertical2, Layers, RotateCw, ScanLine, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCameraStore } from "@/stores/cameraStore";
import { useDocumentStore } from "@/stores/documentStore";
import { useInteractionStore } from "@/stores/interactionStore";

function Toggle({ id, active, onClick, children, label }: { id: string; active?: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button id={id} aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {children}
    </button>
  );
}

function ScanStatusPill() {
  const { scanStatus, page, lastLatencyMs } = useDocumentStore();
  const map = {
    idle: { icon: ScanLine, text: "Idle", cls: "text-zinc-400" },
    "waiting-stable": { icon: ScanLine, text: "Hold page steady…", cls: "text-zinc-300" },
    analyzing: { icon: Loader2, text: "Reading page…", cls: "text-amber-300" },
    recognized: { icon: CheckCircle2, text: page ? `${page.company} · ${page.docType}` : "Recognized", cls: "text-teal-300" },
    error: { icon: AlertCircle, text: "Analysis failed — retrying", cls: "text-rose-300" },
  }[scanStatus];
  const Icon = map.icon;
  return (
    <motion.div layout className="flex min-w-0 items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${map.cls} ${scanStatus === "analyzing" ? "animate-spin" : ""}`} />
      <span className={`truncate ${map.cls}`}>{map.text}</span>
      {scanStatus === "recognized" && lastLatencyMs !== null && <span className="font-mono text-zinc-500">{lastLatencyMs}ms</span>}
    </motion.div>
  );
}

export function TopBar() {
  const { mode, setMode, calibration, toggleCalibration } = useCameraStore();
  const { hudVisible, toggleHud } = useDocumentStore();
  const clearStrokes = useInteractionStore((s) => s.clearStrokes);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-4 border-b border-white/5 bg-[#0a0b0e]/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_24px_-4px_rgba(251,146,60,0.7)]">
          <ScanLine className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
        </div>
        <h1 className="text-[1.05rem] font-semibold tracking-tight text-white">
          Fin<span className="text-amber-300">Bro</span>
        </h1>
      </div>

      <ScanStatusPill />

      <div className="ml-auto flex items-center gap-1.5">
        <div className="mr-2 flex rounded-full bg-white/5 p-0.5 ring-1 ring-white/10">
          {(["demo", "camera"] as const).map((m) => (
            <button
              key={m}
              id={`btn-mode-${m}`}
              onClick={() => setMode(m)}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${mode === m ? "text-black" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {mode === m && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-full bg-amber-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative flex items-center gap-1.5">
                {m === "demo" ? <FileText className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                {m === "demo" ? "Demo" : "Camera"}
              </span>
            </button>
          ))}
        </div>

        {mode === "camera" && (
          <div className="mr-2 flex items-center gap-1.5 border-r border-white/10 pr-3">
            <Toggle id="btn-cal-rotate" label="Rotate 180°" active={calibration.rotate180} onClick={() => toggleCalibration("rotate180")}>
              <RotateCw className="h-4 w-4" /> <span className="text-[0.7rem]">180°</span>
            </Toggle>
            <Toggle id="btn-cal-mirror-h" label="Mirror horizontal" active={calibration.mirrorH} onClick={() => toggleCalibration("mirrorH")}>
              <FlipHorizontal2 className="h-4 w-4" />
            </Toggle>
            <Toggle id="btn-cal-mirror-v" label="Mirror vertical" active={calibration.mirrorV} onClick={() => toggleCalibration("mirrorV")}>
              <FlipVertical2 className="h-4 w-4" />
            </Toggle>
          </div>
        )}

        <Toggle id="btn-toggle-hud" label="Toggle AR overlays" active={hudVisible} onClick={toggleHud}>
          <Layers className="h-4 w-4" />
        </Toggle>
        <Toggle id="btn-clear-ink" label="Clear ink" onClick={clearStrokes}>
          <Eraser className="h-4 w-4" />
        </Toggle>
      </div>
    </header>
  );
}
