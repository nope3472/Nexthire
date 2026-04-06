import { useState, useEffect, useCallback } from "react";
import type { ScreenshotMeta } from "../electron.d.ts";

export function useScreenshots() {
  const [screenshots, setScreenshots] = useState<ScreenshotMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load screenshots on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await window.electronAPI.getScreenshots();
        setScreenshots(data);
      } catch {
        // Failed to load — start with empty array
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Listen for real-time new screenshots (+2 bonus)
  useEffect(() => {
    const removeListener = window.electronAPI.onNewScreenshot(
      (meta: ScreenshotMeta) => {
        setScreenshots((prev) => {
          // Avoid duplicates
          if (prev.some((s) => s.id === meta.id)) return prev;
          return [meta, ...prev];
        });
      }
    );

    return () => {
      removeListener();
    };
  }, []);

  // Set up frame capture handler for screenshot flow
  useEffect(() => {
    const removeListener = window.electronAPI.onCaptureFrame(
      async (sourceId: string) => {
        try {
          // Use getUserMedia with chromeMediaSource constraint
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: sourceId,
                minWidth: 1920,
                minHeight: 1080,
                maxWidth: 3840,
                maxHeight: 2160,
              },
            } as MediaTrackConstraints,
          });

          // Draw one frame to an offscreen canvas
          const video = document.createElement("video");
          video.srcObject = stream;

          // Wait for video to be ready with dimensions
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => resolve();
          });
          await video.play();

          // Small delay to ensure a frame is rendered
          await new Promise((r) => setTimeout(r, 100));

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
          }

          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop());

          // Convert to PNG blob and send back to main
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/png");
          });

          if (blob) {
            const buffer = await blob.arrayBuffer();
            await window.electronAPI.sendFrameData(buffer);
          }
        } catch (err) {
          console.error("Frame capture failed:", err);
        }
      }
    );

    return () => {
      removeListener();
    };
  }, []);

  const deleteScreenshot = useCallback(async (id: string) => {
    const success = await window.electronAPI.deleteScreenshot(id);
    if (success) {
      setScreenshots((prev) => prev.filter((s) => s.id !== id));
    }
    return success;
  }, []);

  const openScreenshot = useCallback(async (filepath: string) => {
    await window.electronAPI.openScreenshot(filepath);
  }, []);

  return {
    screenshots,
    isLoading,
    deleteScreenshot,
    openScreenshot,
  };
}
