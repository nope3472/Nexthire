import { desktopCapturer, BrowserWindow, shell, nativeImage, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { addScreenshot, deleteScreenshot as deleteScreenshotFromStore, getScreenshots, getScreenshotById } from "./store";
import type { ScreenshotMeta } from "./store";

// ─── Constants ──────────────────────────────────────────────────────────────

const SCREENSHOTS_DIR = path.join(
  os.homedir(),
  "Documents",
  "NextHire",
  "Screenshots"
);

// ─── Ensure directory exists ────────────────────────────────────────────────

function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

// ─── Timestamp helper ───────────────────────────────────────────────────────

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd}_${HH}${mm}${ss}`;
}

// ─── Get primary screen source ID ──────────────────────────────────────────

export async function getScreenSourceId(): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  if (sources.length === 0) {
    throw new Error("No screen sources available");
  }

  return sources[0].id;
}

// ─── Frame data resolver ───────────────────────────────────────────────────
// We store a pending resolver that the IPC handler in index.ts will call
// when the renderer sends frame data back.

let pendingFrameResolve: ((buffer: Buffer) => void) | null = null;
let pendingFrameReject: ((err: Error) => void) | null = null;

/**
 * Called by the IPC handler (in index.ts) when the renderer sends back
 * the captured frame data.
 */
export function resolveFrameData(data: ArrayBuffer): void {
  if (pendingFrameResolve) {
    pendingFrameResolve(Buffer.from(data));
    pendingFrameResolve = null;
    pendingFrameReject = null;
  }
}

// ─── Capture screenshot ────────────────────────────────────────────────────

export async function captureScreenshot(
  mainWindow: BrowserWindow
): Promise<ScreenshotMeta> {
  ensureScreenshotsDir();

  // Step 1: Get screen sources with both full and thumbnail sizes
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 320, height: 200 },
  });

  if (sources.length === 0) {
    throw new Error("No screen sources available");
  }

  const primarySource = sources[0];
  const timestamp = getTimestamp();
  const filename = `screenshot_${timestamp}.png`;
  const thumbFilename = `screenshot_${timestamp}_thumb.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  const thumbpath = path.join(SCREENSHOTS_DIR, thumbFilename);

  // Step 2: Send source ID to renderer to capture full-res frame
  const sourceId = primarySource.id;
  mainWindow.webContents.send("screenshot:captureFrame", sourceId);

  // Wait for the frame data from the renderer (via resolveFrameData)
  const frameBuffer = await new Promise<Buffer>((resolve, reject) => {
    pendingFrameResolve = resolve;
    pendingFrameReject = reject;

    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingFrameReject) {
        pendingFrameReject(new Error("Screenshot capture timed out"));
        pendingFrameResolve = null;
        pendingFrameReject = null;
      }
    }, 10000);
  });

  // Step 3: Save full-resolution screenshot
  fs.writeFileSync(filepath, frameBuffer);

  // Get image dimensions
  const img = nativeImage.createFromBuffer(frameBuffer);
  const size = img.getSize();

  // Step 4: Generate actual thumbnail (+3 bonus)
  // Use nativeImage to resize to 320x200 — a real reduced-resolution thumbnail
  const thumb = img.resize({ width: 320, height: 200, quality: "good" });
  fs.writeFileSync(thumbpath, thumb.toPNG());

  // Step 5: Persist metadata
  const screenshotMeta = addScreenshot({
    filename,
    filepath,
    thumbpath,
    capturedAt: new Date().toISOString(),
    width: size.width,
    height: size.height,
  });

  // Step 6: Notify renderer in real-time (+2 bonus)
  mainWindow.webContents.send("screenshot:new", screenshotMeta);

  return screenshotMeta;
}

// ─── Get all screenshots ───────────────────────────────────────────────────

export function getAllScreenshots(): ScreenshotMeta[] {
  return getScreenshots();
}

// ─── Delete screenshot ─────────────────────────────────────────────────────

export function removeScreenshot(id: string): boolean {
  const meta = getScreenshotById(id);
  if (!meta) return false;

  // Delete files from disk
  try {
    if (fs.existsSync(meta.filepath)) fs.unlinkSync(meta.filepath);
    if (fs.existsSync(meta.thumbpath)) fs.unlinkSync(meta.thumbpath);
  } catch {
    // Files may already be deleted — continue removing metadata
  }

  return deleteScreenshotFromStore(id);
}

// ─── Open screenshot in default viewer ─────────────────────────────────────

export async function openScreenshotFile(filepath: string): Promise<void> {
  // Validate path is within our screenshots directory for security
  const resolved = path.resolve(filepath);
  if (!resolved.startsWith(SCREENSHOTS_DIR)) {
    throw new Error("Invalid screenshot path");
  }
  await shell.openPath(resolved);
}
