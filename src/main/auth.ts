import crypto from "crypto";
import { shell, BrowserWindow } from "electron";
import { WorkOS } from "@workos-inc/node";
import { setSession, clearSession, getSession, UserProfile } from "./store";
import { onProtocolCallback, consumeQueuedDeepLinkUrl } from "./protocol";

// ─── Configuration (loaded from process.env — main process only) ────────────

function getConfig() {
  return {
    clientId: process.env.WORKOS_CLIENT_ID || "",
    redirectUri: process.env.WORKOS_REDIRECT_URI || "nexthire://callback",
    apiKey: process.env.WORKOS_API_KEY || "",
    authkitDomain: process.env.WORKOS_AUTHKIT_DOMAIN || "",
  };
}

function getWorkOSClient(config: ReturnType<typeof getConfig>): WorkOS {
  return new WorkOS(config.apiKey || undefined, {
    clientId: config.clientId || undefined,
  });
}

function validateConfig(config: ReturnType<typeof getConfig>): void {
  if (!config.clientId || !config.authkitDomain || !config.redirectUri) {
    throw new Error(
      "Missing WorkOS config. Ensure WORKOS_CLIENT_ID, WORKOS_AUTHKIT_DOMAIN, and WORKOS_REDIRECT_URI are set."
    );
  }

  try {
    const parsed = new URL(config.authkitDomain);
    if (parsed.protocol !== "https:") {
      throw new Error("WORKOS_AUTHKIT_DOMAIN must use https.");
    }
  } catch {
    throw new Error("WORKOS_AUTHKIT_DOMAIN is not a valid URL.");
  }
}

function getAuthErrorFromLocation(location: string | null): string | null {
  if (!location) return null;
  let parsed: URL;
  try {
    parsed = new URL(location);
  } catch {
    return null;
  }

  const error = parsed.searchParams.get("error");
  if (!error) return null;

  if (error === "application_not_found") {
    return [
      "WorkOS returned application_not_found.",
      "The AuthKit domain and Client ID do not belong to the same WorkOS environment.",
      "Fix by pairing WORKOS_AUTHKIT_DOMAIN and WORKOS_CLIENT_ID from the same project/environment and ensure nexthire://callback is in Redirect URIs.",
    ].join(" ");
  }

  return `WorkOS authorization failed: ${error}`;
}

async function preflightAuthorizationUrl(authorizationUrl: string): Promise<void> {
  try {
    const response = await fetch(authorizationUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    const location = response.headers.get("location");
    const authError = getAuthErrorFromLocation(location);
    if (authError) {
      throw new Error(authError);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("application_not_found")) {
      throw error;
    }
    // Ignore transient/network preflight failures and continue.
  }
}

// ─── OAuth Helpers ──────────────────────────────────────────────────────────

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateOauthState(): string {
  return base64URLEncode(crypto.randomBytes(16));
}

// ─── In-memory OAuth state ──────────────────────────────────────────────────

let oauthState: string | null = null;
let oauthTimeout: ReturnType<typeof setTimeout> | null = null;

function resetInFlightOAuthState(): void {
  oauthState = null;
  if (oauthTimeout) {
    clearTimeout(oauthTimeout);
    oauthTimeout = null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initiate the OAuth flow: build the authorization URL, open the browser,
 * and register the callback handler.
 */
export async function startOAuth(mainWindow: BrowserWindow): Promise<void> {
  if (oauthState) {
    throw new Error("Sign-in already in progress. Please complete the current browser flow.");
  }

  const config = getConfig();
  validateConfig(config);

  // Step 1: Generate CSRF state value
  oauthState = generateOauthState();

  // Step 2: Build AuthKit hosted-login URL.
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: oauthState,
    prompt: "login",
  });
  const authkitUrl = new URL(config.authkitDomain);
  authkitUrl.pathname = "/";
  authkitUrl.search = params.toString();
  const authorizationUrl = authkitUrl.toString();

  // Try to surface deterministic config mismatches before opening the browser.
  await preflightAuthorizationUrl(authorizationUrl);

  // Step 3: Open external browser
  await shell.openExternal(authorizationUrl);

  // Start 5-minute timeout
  if (oauthTimeout) clearTimeout(oauthTimeout);
  oauthTimeout = setTimeout(() => {
    resetInFlightOAuthState();
    mainWindow.webContents.send("auth:error", "OAuth timed out. Please try again.");
  }, 5 * 60 * 1000);

  // Step 4: Register protocol callback handler
  const callbackHandler = async (url: string) => {
    try {
      await handleOAuthCallback(url, mainWindow);
    } catch (err) {
      resetInFlightOAuthState();
      const message = err instanceof Error ? err.message : "OAuth callback failed";
      mainWindow.webContents.send("auth:error", message);
    }
  };

  onProtocolCallback(callbackHandler, false);

  const queuedUrl = consumeQueuedDeepLinkUrl();
  if (queuedUrl) {
    try {
      const queuedState = new URL(queuedUrl).searchParams.get("state");
      if (queuedState && queuedState === oauthState) {
        await callbackHandler(queuedUrl);
      }
    } catch {
      // Ignore malformed queued callbacks.
    }
  }
}

/**
 * Handle the OAuth callback from the custom protocol.
 */
async function handleOAuthCallback(callbackUrl: string, mainWindow: BrowserWindow): Promise<void> {
  if (oauthTimeout) clearTimeout(oauthTimeout);
  oauthTimeout = null;

  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (state && state !== oauthState) {
    throw new Error("Invalid OAuth state. This is usually a stale callback from a previous sign-in attempt. Please try signing in again.");
  }

  if (!code) {
    throw new Error("No authorization code received");
  }

  const config = getConfig();

  // Step 5: Token exchange
  const workos = getWorkOSClient(config);
  let tokenData;
  try {
    tokenData = await workos.userManagement.authenticateWithCode({
      clientId: config.clientId,
      code,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Token exchange failed: ${message}`);
  }

  // Step 6: Extract user profile
  const user = tokenData.user;
  const userProfile: UserProfile = {
    id: user?.id || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  };

  // Persist session
  setSession({
    accessToken: tokenData.accessToken || "",
    refreshToken: tokenData.refreshToken || "",
    userProfile,
  });

  // Clean up PKCE state
  resetInFlightOAuthState();

  // Notify renderer
  mainWindow.webContents.send("auth:success", userProfile);
}

/**
 * Get the current session from persistent storage.
 */
export function getSessionData() {
  return getSession();
}

/**
 * Sign out: clear stored tokens and notify the renderer.
 */
export function signOut(mainWindow: BrowserWindow): void {
  clearSession();
  resetInFlightOAuthState();
  mainWindow.webContents.send("auth:signedOut");
}