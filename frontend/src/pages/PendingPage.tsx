import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, X, AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import { pendingApi, PendingEntry } from "../api/scan";
import { customersApi, Customer } from "../api/customers";
import Modal from "../components/UI/Modal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PendingPage() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewEntry, setReviewEntry] = useState<PendingEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([pendingApi.list(), customersApi.list()]);
      setEntries(e);
      setCustomers(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReject = async (id: string) => {
    await pendingApi.reject(id);
    setEntries((prev) => prev.filter((e) => e._id !== id));
  };

  const confidenceBadge = (c: string) => {
    if (c === "high") return <span className="badge badge-green">✓ High confidence</span>;
    if (c === "medium") return <span className="badge badge-yellow">~ Possible</span>;
    return <span className="badge badge-red">? Undefined</span>;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Pending Review</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Scanned challans awaiting confirmation. Review and correct before saving to the ledger.
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : entries.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <CheckCircle size={36} style={{ color: "var(--success)", margin: "0 auto 12px" }} />
          <p className="font-medium" style={{ color: "var(--text)" }}>All caught up!</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            No pending entries. Scan more challans to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="rounded-xl p-4 flex items-start gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Thumbnail */}
              {entry.imageUrl && (
                <img
                  src={`${API_URL}${entry.imageUrl}`}
                  alt="challan"
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                  style={{ background: "var(--surface-2)" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {entry.extractedData.customerName || "Unknown Customer"}
                  </span>
                  {confidenceBadge(entry.matchConfidence)}
                </div>

                {entry.matchedCustomerName && (
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Matched to: <strong>{entry.matchedCustomerName}</strong>
                    {entry.matchMethod ? ` (via ${entry.matchMethod})` : ""}
                  </p>
                )}

                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {entry.extractedData.date && `Date: ${entry.extractedData.date} · `}
                  {entry.extractedData.billNo && `Bill: ${entry.extractedData.billNo} · `}
                  {entry.extractedData.items.length} item{entry.extractedData.items.length !== 1 ? "s" : ""}
                  {entry.extractedData.cash ? ` · Cash: ₹${entry.extractedData.cash}` : ""}
                </p>

                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Scanned: {new Date(entry.createdAt).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleReject(entry._id)}
                  className="btn btn-ghost"
                  style={{ color: "var(--danger)", fontSize: "12px" }}
                >
                  <X size={13} /> Reject
                </button>
                <button
                  onClick={() => setReviewEntry(entry)}
                  className="btn btn-primary"
                  style={{ fontSize: "12px" }}
                >
                  Review <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewEntry && (
        <PendingReviewModal
          entry={reviewEntry}
          customers={customers}
          onClose={() => setReviewEntry(null)}
          onDone={() => { setReviewEntry(null); load(); }}
        />
      )}
    </div>
  );
}

function PendingReviewModal({
  entry,
  customers,
  onClose,
  onDone,
}: {
  entry: PendingEntry;
  customers: Customer[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    customerId: entry.matchedCustomerId || "",
    customerName: entry.extractedData.customerName || "",
    date: (() => {
      const raw = entry.extractedData.date;
      if (!raw) return new Date().toISOString().slice(0, 10);
      const parts = raw.split(/[-\/]/);
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const year = y.length === 2 ? `20${y}` : y;
        return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      return new Date().toISOString().slice(0, 10);
    })(),
    billNo: entry.extractedData.billNo || "",
    cash: entry.extractedData.cash || 0,
    returnAmount: entry.extractedData.returnAmount || 0,
    remarks: entry.extractedData.remarks || "",
  });
  const [items, setItems] = useState(
    entry.extractedData.items.map((i) => ({
      description: i.description,
      qty: i.qty,
      unitPrice: i.unitPrice,
      amount: i.amount,
      serialNumbers: i.serialNumbers?.join(", ") || "",
    }))
  );
  const [saving, setSaving] = useState(false);
  // Confirmation flow for medium confidence
  const [needsConfirm, setNeedsConfirm] = useState(
    entry.matchConfidence === "medium" && !!entry.matchedCustomerName
  );

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    width: "100%",
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await pendingApi.confirm(entry._id, {
        customerId: form.customerId || null,
        customerName: form.customerName,
        date: form.date,
        billNo: form.billNo,
        cash: Number(form.cash),
        returnAmount: Number(form.returnAmount),
        remarks: form.remarks,
        items: items.filter((i) => i.description).map((i) => ({
          description: i.description,
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount) || Number(i.qty) * Number(i.unitPrice),
          serialNumbers: i.serialNumbers ? i.serialNumbers.split(",").map((s) => s.trim()) : [],
        })),
      });
      onDone();
    } catch {
      setSaving(false);
    }
  };

  // Confirmation step for medium matches
  if (needsConfirm) {
    return (
      <Modal title="Confirm Customer Match" onClose={onClose} size="sm">
        <div className="flex items-start gap-3 mb-5">
          <AlertCircle size={20} style={{ color: "var(--warning)", shrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: "var(--text)" }}>
            The AI found <strong>"{entry.extractedData.customerName}"</strong> on this challan.<br />
            Is this the same customer as <strong>"{entry.matchedCustomerName}"</strong> in your list?
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setForm((f) => ({ ...f, customerId: "", customerName: entry.extractedData.customerName }));
              setNeedsConfirm(false);
            }}
            className="btn btn-ghost"
          >
            No, it's different
          </button>
          <button
            onClick={() => {
              const c = customers.find((c) => c._id === entry.matchedCustomerId);
              setForm((f) => ({ ...f, customerId: entry.matchedCustomerId || "", customerName: c?.name || entry.matchedCustomerName }));
              setNeedsConfirm(false);
            }}
            className="btn btn-primary"
          >
            Yes, it's {entry.matchedCustomerName}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Review & Confirm Entry" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Customer</label>
            <select style={inputStyle} value={form.customerId}
              onChange={(e) => {
                const c = customers.find((c) => c._id === e.target.value);
                setForm((f) => ({ ...f, customerId: e.target.value, customerName: c?.name || f.customerName }));
              }}>
              <option value="">-- Undefined --</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name on Challan</label>
            <input style={inputStyle} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Date</label>
            <input type="date" style={inputStyle} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Bill No</label>
            <input style={inputStyle} value={form.billNo} onChange={(e) => set("billNo", e.target.value)} />
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--text-muted)" }}>ITEMS</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <input className="col-span-4" style={inputStyle} value={item.description}
                    onChange={(e) => { const c = [...items]; c[idx].description = e.target.value; setItems(c); }} />
                  <input className="col-span-3" style={inputStyle} placeholder="Serials" value={item.serialNumbers}
                    onChange={(e) => { const c = [...items]; c[idx].serialNumbers = e.target.value; setItems(c); }} />
                  <input type="number" className="col-span-1" style={{ ...inputStyle, textAlign: "right" }} value={item.qty}
                    onChange={(e) => {
                      const c = [...items]; c[idx].qty = Number(e.target.value);
                      c[idx].amount = c[idx].qty * c[idx].unitPrice; setItems(c);
                    }} />
                  <input type="number" className="col-span-2" style={{ ...inputStyle, textAlign: "right" }} value={item.unitPrice}
                    onChange={(e) => {
                      const c = [...items]; c[idx].unitPrice = Number(e.target.value);
                      c[idx].amount = c[idx].qty * c[idx].unitPrice; setItems(c);
                    }} />
                  <input type="number" className="col-span-2" style={{ ...inputStyle, textAlign: "right" }} value={item.amount}
                    onChange={(e) => { const c = [...items]; c[idx].amount = Number(e.target.value); setItems(c); }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Cash Received</label>
            <input type="number" style={inputStyle} value={form.cash} onChange={(e) => set("cash", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Return Amount</label>
            <input type="number" style={inputStyle} value={form.returnAmount} onChange={(e) => set("returnAmount", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Remarks</label>
            <input style={inputStyle} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={async () => { await pendingApi.reject(entry._id); onDone(); }}
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
          >
            <X size={14} /> Reject Entry
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button onClick={handleConfirm} disabled={saving} className="btn btn-primary">
              <CheckCircle size={15} /> {saving ? "Saving..." : "Confirm & Save to Ledger"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
