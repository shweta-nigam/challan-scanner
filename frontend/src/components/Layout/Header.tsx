import React from "react";
import { Sun, Moon, LogOut, ScanLine } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header
      style={{
        background: "var(--header-bg)",
        color: "var(--header-fg)",
        borderBottom: "1px solid var(--border)",
      }}
      className="flex items-center justify-between px-5 py-3 gap-4"
    >
      <div className="flex items-center gap-2">
        <ScanLine size={22} />
        <div>
          <h1 className="text-base font-bold tracking-tight leading-none">Challan Scanner</h1>
          <p className="text-xs opacity-60 leading-none mt-0.5">Age Security Systems</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="btn btn-ghost text-[var(--header-fg)] border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.08)]"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {user && (
          <div className="flex items-center gap-2">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-sm hidden sm:block opacity-80">{user.name}</span>
            <button
              onClick={logout}
              className="btn btn-ghost text-[var(--header-fg)] border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.08)]"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
