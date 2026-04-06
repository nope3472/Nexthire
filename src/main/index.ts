import { app, BrowserWindow, ipcMain, session } from "electron";
import * as path from "path";
import { registerProtocol } from "./protocol";
import { startOAuth, getSessionData, signOut } from "./auth";
import {
  captureScreenshot,
  getAllScreenshots,
  removeScreenshot,
  openScreenshotFile,
  getScreenSourceId,
  resolveFrameData,
} from "./screenshot";

// ─── Single instance lock ───────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ─── Register custom protocol BEFORE app.ready ─────────────────────────────
registerProtocol();

// ─── Main window reference ─────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "NextHire",
    backgroundColor: "#0f172a",
    titleBarStyle: "hiddenInset",
    frame: process.platform === "darwin" ? false : true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for desktopCapturer access via preload
    },
  });

  // Graceful show to avoid flash of white
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production, load the built renderer
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle("auth:start", async () => {
    if (!mainWindow) return;
    await startOAuth(mainWindow);
  });

  ipcMain.handle("auth:getSession", () => {
    return getSessionData();
  });

  ipcMain.handle("auth:signout", () => {
    if (!mainWindow) return;
    signOut(mainWindow);
  });

  // Screenshots
  ipcMain.handle("screenshot:capture", async () => {
    if (!mainWindow) throw new Error("No window available");
    return await captureScreenshot(mainWindow);
  });

  ipcMain.handle("screenshot:getAll", () => {
    return getAllScreenshots();
  });

  ipcMain.handle("screenshot:delete", (_event, id: string) => {
    const deleted = removeScreenshot(id);
    if (deleted && mainWindow) {
      mainWindow.webContents.send("screenshot:deleted", id);
    }
    return deleted;
  });

  ipcMain.handle("screenshot:open", async (_event, filepath: string) => {
    await openScreenshotFile(filepath);
  });

  ipcMain.handle("screenshot:getSourceId", async () => {
    return await getScreenSourceId();
  });

  // Frame data from renderer (for screenshot capture)
  ipcMain.handle("screenshot:saveFrame", (_event, buffer: ArrayBuffer) => {
    resolveFrameData(buffer);
  });
}

// ─── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Set up Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: file: blob:;",
        ],
      },
    });
  });

  createWindow();
  registerIpcHandlers();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
