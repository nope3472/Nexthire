import type { UserProfile } from "../electron.d.ts";
import { LogOut } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  onSignOut: () => void;
}

/**
 * Generate a consistent avatar color from the user's name.
 * Uses a simple hash to map to a curated set of gradient pairs.
 */
function getAvatarGradient(name: string): string {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-emerald-500 to-teal-400",
    "from-orange-500 to-amber-400",
    "from-rose-500 to-pink-400",
    "from-indigo-500 to-blue-400",
    "from-violet-500 to-purple-400",
    "from-sky-500 to-blue-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(user: UserProfile): string {
  const first = user.firstName?.charAt(0)?.toUpperCase() || "";
  const last = user.lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || user.email?.charAt(0)?.toUpperCase() || "?";
}

export default function Navbar({ user, onSignOut }: NavbarProps) {
  const initials = getInitials(user);
  const gradient = getAvatarGradient(
    `${user.firstName} ${user.lastName}`
  );

  return (
    <nav className="flex items-center justify-between px-6 py-3 glass-strong border-b border-slate-700/50 drag-region">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 no-drag">
        <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-md shadow-blue-500/10">
          <span className="text-white font-bold text-xs">NH</span>
        </div>
        <span className="text-lg font-semibold tracking-tight gradient-text">
          NextHire
        </span>
      </div>

      {/* Right: User info + Sign Out */}
      <div className="flex items-center gap-4 no-drag">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}
          >
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>

          {/* Name & Email */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-100 leading-tight">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-400 leading-tight">
              {user.email}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-700/50" />

        {/* Sign Out */}
        <button
          id="sign-out-button"
          onClick={onSignOut}
          className="btn-ghost flex items-center gap-2 text-sm text-slate-400 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
