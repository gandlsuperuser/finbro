"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useCameraStore } from "@/stores/cameraStore";

/**
 * getUserMedia lifecycle. Prefers the rear ("environment") camera — the lens the
 * periscope mirror sits over — and locks resolution to 1920×1440 (4:3) when
 * available so the frame geometry is stable for bbox mapping.
 */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const { mode, deviceId, setStatus, setResolution, setDevices, setDeviceId } = useCameraStore();

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (mode !== "camera") {
      stop();
      setResolution(null);
      setStatus("idle");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable", "Camera API not available (requires HTTPS or localhost).");
      return;
    }
    let cancelled = false;
    setStatus("requesting");

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1920 },
            height: { ideal: 1440 },
            aspectRatio: { ideal: 4 / 3 },
            frameRate: { ideal: 30, max: 30 },
          },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        stop();
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        // Lock exposure/focus-friendly settings where supported (iPadOS ignores unknowns).
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
        } catch {}

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.muted = true;
          await video.play().catch(() => {});
          const onMeta = () => setResolution({ width: video.videoWidth, height: video.videoHeight });
          if (video.videoWidth) onMeta();
          else video.addEventListener("loadedmetadata", onMeta, { once: true });
        }
        const settings = track.getSettings();
        if (settings.deviceId) setDeviceId(settings.deviceId);
        setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));
        setStatus("live");
      } catch (e) {
        const err = e as DOMException;
        setStatus(err?.name === "NotAllowedError" ? "denied" : "unavailable", err?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, deviceId]);
}
