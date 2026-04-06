import { useState } from "react";
import { Loader2, ArrowRight, Shield, Camera, Zap } from "lucide-react";

interface LoginScreenProps {
  onSignIn: () => void;
}

export default function LoginScreen({ onSignIn }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await onSignIn();
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8 animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-lg">NH</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="gradient-text">NextHire</span>
            </h1>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xl text-slate-300 font-light mb-2 text-center">
          Hire smarter. Move faster.
        </p>
        <p className="text-sm text-slate-500 mb-10 text-center max-w-xs">
          Capture, organize, and share screenshots seamlessly across your hiring workflow.
        </p>

        {/* Sign In Button */}
        <button
          id="sign-in-button"
          onClick={handleSignIn}
          disabled={isLoading}
          className="group w-full max-w-xs btn-primary flex items-center justify-center gap-3 py-4 text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Opening browser…</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Sign in with NextHire</span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </>
          )}
        </button>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Quick Capture
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                One-click screenshots
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Instant Sync
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time gallery
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-slate-600">
          Secured by WorkOS · Enterprise-grade authentication
        </p>
      </div>
    </div>
  );
}
