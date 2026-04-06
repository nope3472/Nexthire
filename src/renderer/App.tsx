import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import { Loader2 } from "lucide-react";

export default function App() {
  const { user, isLoading, error, signIn, signOut, clearError } = useAuth();
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: "success" | "error" }>
  >([]);

  // Toast helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Show auth errors as toasts
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      clearError();
    }
  }, [error, clearError]);

  // Full-screen loading spinner
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center gradient-bg">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse" />
            <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading NextHire…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col gradient-bg">
      {user ? (
        <Dashboard user={user} signOut={signOut} showToast={showToast} />
      ) : (
        <LoginScreen onSignIn={signIn} />
      )}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter glass-strong rounded-xl px-5 py-3.5 shadow-2xl flex items-center gap-3 min-w-[280px] ${
              toast.type === "error"
                ? "border-red-500/30"
                : "border-green-500/30"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                toast.type === "error" ? "bg-red-400" : "bg-green-400"
              }`}
            />
            <span className="text-sm text-slate-200">{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
