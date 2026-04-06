import { useScreenshots } from "../hooks/useScreenshots";
import ScreenshotCard from "./ScreenshotCard";
import { ImageOff } from "lucide-react";

export default function ScreenshotGallery() {
  const { screenshots, isLoading, deleteScreenshot, openScreenshot } =
    useScreenshots();

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-xl overflow-hidden">
            <div className="aspect-video skeleton" />
            <div className="p-3.5 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-slate-700/20 blur-2xl scale-150" />
          <div className="relative w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-slate-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">
          No screenshots yet
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Click the "Take Screenshot" button above to capture your first
          screenshot.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
      {screenshots.map((screenshot) => (
        <ScreenshotCard
          key={screenshot.id}
          screenshot={screenshot}
          onDelete={deleteScreenshot}
          onOpen={openScreenshot}
        />
      ))}
    </div>
  );
}
