export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ScreenshotMeta {
  id: string;
  filename: string;
  filepath: string;
  thumbpath: string;
  capturedAt: string;
  width: number;
  height: number;
}

export interface ElectronAPI {
  // Auth
  startOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  getSession: () => Promise<{
    accessToken?: string;
    refreshToken?: string;
    userProfile?: UserProfile;
  }>;

  // Screenshots
  captureScreenshot: () => Promise<void>;
  getScreenshots: () => Promise<ScreenshotMeta[]>;
  deleteScreenshot: (id: string) => Promise<boolean>;
  openScreenshot: (filepath: string) => Promise<void>;

  // Screenshot frame capture
  getScreenSourceId: () => Promise<string>;
  sendFrameData: (buffer: ArrayBuffer) => Promise<void>;

  // Events
  onAuthSuccess: (callback: (user: UserProfile) => void) => () => void;
  onAuthError: (callback: (error: string) => void) => () => void;
  onSignedOut: (callback: () => void) => () => void;
  onNewScreenshot: (callback: (meta: ScreenshotMeta) => void) => () => void;
  onDeletedScreenshot: (callback: (id: string) => void) => () => void;
  onCaptureFrame: (callback: (sourceId: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
