import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LedgerPage from "./pages/LedgerPage";
import CustomersPage from "./pages/CustomersPage";
import ScanPage from "./pages/ScanPage";
import PendingPage from "./pages/PendingPage";

import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import { pendingApi } from "./api/scan";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

type Page = "Dashboard" | "Ledger" | "Customers" | "Scan" | "Pending";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("Dashboard");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    pendingApi.list().then((p) => setPendingCount(p.length)).catch(() => {});
    const interval = setInterval(() => {
      pendingApi.list().then((p) => setPendingCount(p.length)).catch(() => {});
    }, 30000); // Refresh pending count every 30s
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (page) {
      case "Dashboard": return <DashboardPage onNavigate={setPage} />;
      case "Ledger": return <LedgerPage />;
      case "Customers": return <CustomersPage />;
      case "Scan": return <ScanPage />;
      case "Pending": return <PendingPage />;
      default: return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={page} onChange={setPage} pendingCount={pendingCount} />
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
