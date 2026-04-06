import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "../electron.d.ts";
import Navbar from "./Navbar";
import ScreenshotGallery from "./ScreenshotGallery";
import { Camera, Loader2 } from "lucide-react";

interface DashboardProps {
  user: UserProfile;
  signOut: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

export default function Dashboard({
  user,
  signOut,
  showToast,
}: DashboardProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [screenshotCount, setScreenshotCount] = useState(0);

  // Load count on mount
  useEffect(() => {
    const loadCount = async () => {
      try {
        const screenshots = await window.electronAPI.getScreenshots();
        setScreenshotCount(screenshots.length);
      } catch {
        // ignore
      }
    };
    loadCount();

    // Listen for new screenshots to update count
    const removeNewScreenshotListener = window.electronAPI.onNewScreenshot(() => {
      setScreenshotCount((prev) => prev + 1);
    });
    const removeDeletedScreenshotListener = window.electronAPI.onDeletedScreenshot(() => {
      setScreenshotCount((prev) => Math.max(0, prev - 1));
    });

    return () => {
      removeNewScreenshotListener();
      removeDeletedScreenshotListener();
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;

    // Start countdown 3..2..1
    setCountdown(3);

    await new Promise<void>((resolve) => {
      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(interval);
          setCountdown(null);
          resolve();
        }
      }, 800);
    });

    setIsCapturing(true);
    try {
      await window.electronAPI.captureScreenshot();
      showToast("Screenshot captured successfully!", "success");
    } catch {
      showToast("Failed to capture screenshot", "error");
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, showToast]);

  return (
    <div className="h-full flex flex-col">
      {/* Navbar */}
      <Navbar user={user} onSignOut={signOut} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Capture Button */}
          <div className="flex justify-center mb-8">
            <button
              id="capture-screenshot-button"
              onClick={handleCapture}
              disabled={isCapturing || countdown !== null}
              className="group btn-primary flex items-center gap-3 px-8 py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Capturing…</span>
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Take Screenshot</span>
                </>
              )}
            </button>
          </div>

          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-slate-100">
              Saved Screenshots
            </h2>
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
              {screenshotCount}
            </span>
          </div>

          {/* Gallery */}
          <ScreenshotGallery />
        </div>
      </main>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-navy-900/80 backdrop-blur-md flex items-center justify-center">
          <div key={countdown} className="countdown-number">
            <span className="text-9xl font-bold gradient-text text-glow">
              {countdown}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
