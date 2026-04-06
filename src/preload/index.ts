import { contextBridge, ipcRenderer } from "electron";

// ─── Type-safe API exposed to the renderer process ──────────────────────────
// Only these methods are available via window.electronAPI.
// contextIsolation: true ensures no Node.js APIs leak into the renderer.

const electronAPI = {
  // ── Auth ────────────────────────────────────────────────────────────────
  startOAuth: (): Promise<void> => ipcRenderer.invoke("auth:start"),
  signOut: (): Promise<void> => ipcRenderer.invoke("auth:signout"),
  getSession: (): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userProfile?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }> => ipcRenderer.invoke("auth:getSession"),

  // ── Screenshots ─────────────────────────────────────────────────────────
  captureScreenshot: (): Promise<void> =>
    ipcRenderer.invoke("screenshot:capture"),
  getScreenshots: (): Promise<
    Array<{
      id: string;
      filename: string;
      filepath: string;
      thumbpath: string;
      capturedAt: string;
      width: number;
      height: number;
    }>
  > => ipcRenderer.invoke("screenshot:getAll"),
  deleteScreenshot: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("screenshot:delete", id),
  openScreenshot: (filepath: string): Promise<void> =>
    ipcRenderer.invoke("screenshot:open", filepath),

  // ── Screenshot frame capture (renderer-side) ────────────────────────────
  getScreenSourceId: (): Promise<string> =>
    ipcRenderer.invoke("screenshot:getSourceId"),
  sendFrameData: (buffer: ArrayBuffer): Promise<void> =>
    ipcRenderer.invoke("screenshot:saveFrame", buffer),

  // ── Events (main → renderer) ────────────────────────────────────────────
  onAuthSuccess: (
    callback: (user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      user: { id: string; firstName: string; lastName: string; email: string }
    ) => callback(user);
    ipcRenderer.on("auth:success", handler);
    return () => ipcRenderer.removeListener("auth:success", handler);
  },

  onAuthError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, err: string) =>
      callback(err);
    ipcRenderer.on("auth:error", handler);
    return () => ipcRenderer.removeListener("auth:error", handler);
  },

  onSignedOut: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("auth:signedOut", handler);
    return () => ipcRenderer.removeListener("auth:signedOut", handler);
  },

  onNewScreenshot: (
    callback: (meta: {
      id: string;
      filename: string;
      filepath: string;
      thumbpath: string;
      capturedAt: string;
      width: number;
      height: number;
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      meta: {
        id: string;
        filename: string;
        filepath: string;
        thumbpath: string;
        capturedAt: string;
        width: number;
        height: number;
      }
    ) => callback(meta);
    ipcRenderer.on("screenshot:new", handler);
    return () => ipcRenderer.removeListener("screenshot:new", handler);
  },

  onDeletedScreenshot: (callback: (id: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string) =>
      callback(id);
    ipcRenderer.on("screenshot:deleted", handler);
    return () => ipcRenderer.removeListener("screenshot:deleted", handler);
  },

  onCaptureFrame: (callback: (sourceId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sourceId: string) =>
      callback(sourceId);
    ipcRenderer.on("screenshot:captureFrame", handler);
    return () =>
      ipcRenderer.removeListener("screenshot:captureFrame", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
