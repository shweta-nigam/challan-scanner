import React, { useEffect, useState } from "react";
import { ClipboardList, Users, AlertCircle, TrendingUp, ScanLine } from "lucide-react";
import { transactionsApi } from "../api/transactions";
import { pendingApi } from "../api/scan";

type Page = "Dashboard" | "Ledger" | "Customers" | "Scan" | "Pending";

interface DashboardPageProps {
  onNavigate: (p: Page) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [summary, setSummary] = useState({ totalTransactions: 0, customers: 0 });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    transactionsApi.summary().then(setSummary).catch(() => {});
    pendingApi.list().then((p) => setPendingCount(p.length)).catch(() => {});
  }, []);

  const cards = [
    {
      title: "Total Entries",
      value: summary.totalTransactions,
      icon: ClipboardList,
      desc: "Verified ledger transactions",
      page: "Ledger" as Page,
    },
    {
      title: "Customers",
      value: summary.customers,
      icon: Users,
      desc: "Saved customer records",
      page: "Customers" as Page,
    },
    {
      title: "Pending Review",
      value: pendingCount,
      icon: AlertCircle,
      desc: "Scanned, awaiting confirmation",
      page: "Pending" as Page,
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Dashboard
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Overview of your challan records.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {cards.map(({ title, value, icon: Icon, desc, page }) => (
          <button
            key={title}
            onClick={() => onNavigate(page)}
            className="rounded-xl p-5 text-left shadow-sm transition-opacity hover:opacity-80"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{title}</p>
              <Icon size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="mt-3 text-3xl font-bold" style={{ color: "var(--text)" }}>
              {value}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => onNavigate("Scan")} className="btn btn-primary">
            <ScanLine size={16} /> Scan Challan
          </button>
          <button onClick={() => onNavigate("Ledger")} className="btn btn-ghost">
            <ClipboardList size={16} /> Open Ledger
          </button>
          <button onClick={() => onNavigate("Customers")} className="btn btn-ghost">
            <Users size={16} /> Manage Customers
          </button>
        </div>
      </div>
    </div>
  );
}
