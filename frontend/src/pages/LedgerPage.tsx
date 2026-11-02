import React from "react";
import MasterLedger from "../components/Ledger/MasterLedger";

export default function LedgerPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Master Ledger</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          All verified challan entries. Click any cell to edit inline. Select rows to copy to Excel.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <MasterLedger />
      </div>
    </div>
  );
}
