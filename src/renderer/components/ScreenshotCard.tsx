import { useState } from "react";
import type { ScreenshotMeta } from "../electron.d.ts";
import { Trash2, ExternalLink, Calendar, Camera } from "lucide-react";

interface ScreenshotCardProps {
  screenshot: ScreenshotMeta;
  onDelete: (id: string) => Promise<boolean>;
  onOpen: (filepath: string) => Promise<void>;
}

function formatDate(isoStr: string): string {
  const date = new Date(isoStr);
  return (
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

export default function ScreenshotCard({
  screenshot,
  onDelete,
  onOpen,
}: ScreenshotCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(screenshot.id);
    setIsDeleting(false);
    setShowConfirm(false);
  };

  // Use file:// protocol for local images
  // Use thumbpath for actual reduced-resolution thumbnail (+3 bonus)
  const imageSrc = imageError
    ? undefined
    : `file://${screenshot.thumbpath || screenshot.filepath}`;

  return (
    <div className="group relative glass rounded-xl overflow-hidden card-glow animate-scale-in">
      {/* Thumbnail */}
      <div
        className="relative aspect-video bg-navy-900 cursor-pointer overflow-hidden"
        onClick={() => onOpen(screenshot.filepath)}
      >
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={screenshot.filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Camera className="w-8 h-8" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="flex items-center gap-2 text-white bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">Open</span>
            </div>
          </div>
        </div>

        {/* Resolution badge */}
        {screenshot.width > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
            {screenshot.width}×{screenshot.height}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-sm font-medium text-slate-200 truncate mb-1.5">
          {screenshot.filename}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">
              {formatDate(screenshot.capturedAt)}
            </span>
          </div>

          {/* Delete button */}
          <button
            id={`delete-screenshot-${screenshot.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-navy-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-fade-in z-10">
          <p className="text-sm text-slate-200 font-medium px-4 text-center">
            Delete this screenshot?
          </p>
          <p className="text-xs text-slate-500 px-6 text-center">
            This will permanently remove the file from disk.
          </p>
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
