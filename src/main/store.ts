import ElectronStore from "electron-store";
import { v4 as uuidv4 } from "uuid";

// ─── Type Definitions ───────────────────────────────────────────────────────

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

interface StoreSchema {
  auth: {
    accessToken?: string;
    refreshToken?: string;
    userProfile?: UserProfile;
  };
  screenshots: ScreenshotMeta[];
}

// ─── Store Instance ─────────────────────────────────────────────────────────

const store = new ElectronStore<StoreSchema>({
  name: "nexthire-data",
  encryptionKey: "nexthire-enc-key-2025",
  defaults: {
    auth: {},
    screenshots: [],
  },
});

// ─── Auth Helpers ───────────────────────────────────────────────────────────

export function getSession(): StoreSchema["auth"] {
  return store.get("auth");
}

export function setSession(session: StoreSchema["auth"]): void {
  store.set("auth", session);
}

export function clearSession(): void {
  store.set("auth", {});
}

// ─── Screenshot Helpers ─────────────────────────────────────────────────────

export function getScreenshots(): ScreenshotMeta[] {
  return store.get("screenshots");
}

export function addScreenshot(
  meta: Omit<ScreenshotMeta, "id">
): ScreenshotMeta {
  const screenshot: ScreenshotMeta = {
    id: uuidv4(),
    ...meta,
  };
  const screenshots = store.get("screenshots");
  screenshots.unshift(screenshot);
  store.set("screenshots", screenshots);
  return screenshot;
}

export function deleteScreenshot(id: string): boolean {
  const screenshots = store.get("screenshots");
  const filtered = screenshots.filter((s) => s.id !== id);
  if (filtered.length === screenshots.length) return false;
  store.set("screenshots", filtered);
  return true;
}

export function getScreenshotById(
  id: string
): ScreenshotMeta | undefined {
  const screenshots = store.get("screenshots");
  return screenshots.find((s) => s.id === id);
}

export default store;
