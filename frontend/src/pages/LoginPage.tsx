import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { ScanLine, ShieldCheck, Layers, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent)" }}
            >
              <ScanLine size={28} color="var(--accent-fg)" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              Challan Scanner
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Age Security Systems · Central Ledger
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: ScanLine, text: "AI-powered challan scanning & OCR" },
              { icon: Layers, text: "Excel-style master ledger" },
              { icon: ShieldCheck, text: "Secure, per-business data isolation" },
              { icon: BarChart3, text: "Customer-wise running balances" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--surface-2)" }}
                >
                  <Icon size={14} style={{ color: "var(--text-muted)" }} />
                </div>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Google Sign-in */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(cr) => {
                if (cr.credential) login(cr.credential).catch(console.error);
              }}
              onError={() => console.error("Google login failed")}
              shape="rectangular"
              size="large"
              text="signin_with"
              theme="outline"
            />
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Each account's records are private and isolated.
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
