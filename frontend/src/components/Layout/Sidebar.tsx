import React from "react";
import {
  ClipboardList,
  Users,
  ScanLine,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

type Page = "Dashboard" | "Ledger" | "Customers" | "Scan" | "Pending";

interface SidebarProps {
  active: Page;
  onChange: (p: Page) => void;
  pendingCount: number;
}

const nav: { label: Page; icon: React.ElementType }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Ledger", icon: ClipboardList },
  { label: "Customers", icon: Users },
  { label: "Scan", icon: ScanLine },
  { label: "Pending", icon: AlertCircle },
];

export default function Sidebar({ active, onChange, pendingCount }: SidebarProps) {
  return (
    <aside
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        minHeight: "100%",
      }}
      className="hidden md:block w-56 shrink-0 p-3"
    >
      <p
        style={{ color: "var(--text-muted)" }}
        className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
      >
        Workspace
      </p>
      <nav className="space-y-0.5">
        {nav.map(({ label, icon: Icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => onChange(label)}
              style={{
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "var(--accent-fg)" : "var(--text)",
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:opacity-80"
            >
              <Icon size={17} />
              {label}
              {label === "Pending" && pendingCount > 0 && (
                <span className="ml-auto badge badge-yellow">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
