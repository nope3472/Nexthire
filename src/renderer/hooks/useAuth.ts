import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "../electron.d.ts";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await window.electronAPI.getSession();
        if (session?.userProfile) {
          setState({
            user: session.userProfile,
            isLoading: false,
            error: null,
          });
        } else {
          setState({ user: null, isLoading: false, error: null });
        }
      } catch {
        setState({ user: null, isLoading: false, error: null });
      }
    };
    checkSession();
  }, []);

  // Listen for auth events
  useEffect(() => {
    const removeAuthSuccess = window.electronAPI.onAuthSuccess(
      (user: UserProfile) => {
        setState({ user, isLoading: false, error: null });
      }
    );

    const removeAuthError = window.electronAPI.onAuthError(
      (error: string) => {
        setState((prev) => ({ ...prev, isLoading: false, error }));
      }
    );

    const removeSignedOut = window.electronAPI.onSignedOut(() => {
      setState({ user: null, isLoading: false, error: null });
    });

    return () => {
      removeAuthSuccess();
      removeAuthError();
      removeSignedOut();
    };
  }, []);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await window.electronAPI.startOAuth();
      // The actual user data will arrive via onAuthSuccess event
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to start sign-in. Please try again.",
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await window.electronAPI.signOut();
    } catch {
      // signOut event will still fire
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    signIn,
    signOut,
    clearError,
  };
}
