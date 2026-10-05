"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Settings2, Globe, Sliders, ChevronDown } from "lucide-react";
import { useQwenStore } from "@/stores/qwenStore";

export function QwenStatusPill() {
  const [open, setOpen] = useState(false);
  const {
    endpoint,
    setEndpoint,
    model,
    setModel,
    status,
    latencyMs,
    errorMessage,
    isStreaming,
    showScreenCallout,
    toggleScreenCallout,
    testConnection,
  } = useQwenStore();

  const [inputUrl, setInputUrl] = useState(endpoint);
  const [testing, setTesting] = useState(false);

  // Ping on initial mount
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  const handleTest = async () => {
    setTesting(true);
    setEndpoint(inputUrl);
    await testConnection();
    setTesting(false);
  };

  const isGenerating = isStreaming || status === "generating";
  const isOnline = status === "connected" || status === "idle" || isGenerating;

  return (
    <div className="relative">
      <button
        id="btn-qwen-status"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ring-1 backdrop-blur-md ${
          isGenerating
            ? "bg-amber-400/10 text-amber-200 ring-amber-400/30"
            : isOnline
            ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30 hover:bg-emerald-400/15"
            : "bg-rose-400/10 text-rose-200 ring-rose-400/30 hover:bg-rose-400/15"
        }`}
        title="Qwen 3.5 大模型连接状态 (点击配置)"
      >
        <div className="relative flex h-2 w-2 items-center justify-center">
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin text-amber-300" />
          ) : isOnline ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </>
          ) : (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
          )}
        </div>

        <span className="font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-300" />
          Qwen 3.5
        </span>

        {latencyMs !== null && isOnline && !isGenerating && (
          <span className="font-mono text-[0.65rem] text-zinc-400">{latencyMs}ms</span>
        )}

        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {/* Settings Popover */}
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="glass-panel absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0d0e14]/95 p-4 shadow-2xl backdrop-blur-2xl text-zinc-200"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-300" />
                  <h3 className="text-xs font-semibold text-white">Qwen 3.5 连线配置</h3>
                </div>
                <span className={`text-[0.68rem] px-2 py-0.5 rounded-full font-mono ${
                  isOnline ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
                }`}>
                  {isOnline ? "服务正常" : "服务异常"}
                </span>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="text-[0.68rem] font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Globe className="h-3 w-3" />
                    模型 API 服务地址 (OpenAI 协议兼容)
                  </label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-2.5 py-1.5 font-mono text-[0.7rem] text-zinc-100 focus:border-amber-400/50 focus:outline-none"
                    placeholder="https://.../v1"
                  />
                </div>

                <div>
                  <label className="text-[0.68rem] font-medium text-zinc-400 mb-1 block">
                    模型标识 (Model ID)
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-2.5 py-1.5 font-mono text-[0.7rem] text-zinc-100 focus:border-amber-400/50 focus:outline-none"
                    placeholder="qwen3.5-9b-mlx"
                  />
                </div>

                {errorMessage && (
                  <p className="text-[0.65rem] text-rose-400 bg-rose-400/10 p-2 rounded-lg border border-rose-400/20">
                    {errorMessage}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[0.72rem] text-zinc-300">屏幕 AR 浮动解说气泡</span>
                  <button
                    type="button"
                    onClick={toggleScreenCallout}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      showScreenCallout ? "bg-amber-400" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                        showScreenCallout ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-1.5 text-[0.7rem] font-medium text-zinc-200 hover:bg-white/15 hover:text-white transition disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings2 className="h-3 w-3" />}
                    测试连接 (Ping)
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
