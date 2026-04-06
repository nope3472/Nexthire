import { app, BrowserWindow } from "electron";
import path from "path";

// ─── Cold-start deep link queue ─────────────────────────────────────────────
// If the app is launched via a nexthire:// URL (cold start), the URL arrives
// before the main window is ready.  We queue it and process once the app is
// fully initialized.  (+3 bonus: cold-start deep link handling)

let queuedDeepLinkUrl: string | null = null;
let protocolCallbackHandler: ((url: string) => void) | null = null;

/**
 * Register the "nexthire" custom protocol so the OS routes
 * nexthire://callback?code=...&state=... back to this app.
 *
 * Must be called as early as possible — ideally BEFORE app.ready.
 */
export function registerProtocol(): void {
  // On Windows development runs, we must pass the app entry path explicitly,
  // otherwise the protocol can resolve to C:\Windows\System32.
  if (!app.isPackaged) {
    const appEntryArg = process.argv[1];
    if (appEntryArg) {
      const resolvedAppEntry = path.resolve(appEntryArg);
      app.setAsDefaultProtocolClient("nexthire", process.execPath, [
        resolvedAppEntry,
      ]);
    } else {
      app.setAsDefaultProtocolClient("nexthire");
    }
  } else {
    app.setAsDefaultProtocolClient("nexthire");
  }

  // ── macOS deep link (app already running) ──────────────────────────────
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // ── Windows / Linux: second instance deep link ────────────────────────
  app.on("second-instance", (_event, argv) => {
    // On Windows the deep-link URL is the last argv entry
    const url = argv.find((arg) => arg.startsWith("nexthire://"));
    if (url) {
      handleDeepLink(url);
    }

    // Focus the existing window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // ── Cold-start: check process.argv for a deep-link URL ────────────────
  const coldStartUrl = process.argv.find((arg) =>
    arg.startsWith("nexthire://")
  );
  if (coldStartUrl) {
    queuedDeepLinkUrl = coldStartUrl;
  }
}

/**
 * Set the callback that will be invoked when a deep-link URL arrives.
 * Also flushes any URL that was queued during cold start.
 */
export function onProtocolCallback(
  handler: (url: string) => void,
  flushQueued = true
): void {
  protocolCallbackHandler = handler;

  // Flush queued cold-start URL
  if (flushQueued && queuedDeepLinkUrl) {
    handler(queuedDeepLinkUrl);
    queuedDeepLinkUrl = null;
  }
}

/**
 * Consume and clear any queued deep-link URL.
 * Useful to avoid replaying stale callbacks across auth retries.
 */
export function consumeQueuedDeepLinkUrl(): string | null {
  const queued = queuedDeepLinkUrl;
  queuedDeepLinkUrl = null;
  return queued;
}

// ─── Internal ───────────────────────────────────────────────────────────────

function handleDeepLink(url: string): void {
  if (protocolCallbackHandler) {
    protocolCallbackHandler(url);
  } else {
    // App not ready yet — queue it
    queuedDeepLinkUrl = url;
  }
}
