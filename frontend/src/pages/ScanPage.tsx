import React, { useState, useRef, useCallback } from "react";
import { Upload, X, ScanLine, CheckCircle, AlertTriangle, ChevronRight, Plus, Trash2 } from "lucide-react";
import { scanApi, type ScanResult, pendingApi } from "../api/scan";
import { customersApi,type Customer } from "../api/customers";
import Modal from "../components/UI/Modal";
import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ScanPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {});
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const imgs = newFiles.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs]);
    imgs.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const scan = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setResults([]);
    try {
      const data = await scanApi.scan(files);
      setResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const confidenceBadge = (c: string) => {
    if (c === "high") return <span className="badge badge-green">✓ Matched</span>;
    if (c === "medium") return <span className="badge badge-yellow">~ Possible match</span>;
    return <span className="badge badge-red">? Undefined</span>;
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Scan Challan</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Upload one or multiple challan images. AI will extract the data automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 p-10 transition-colors mb-4"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border)",
          background: dragging ? "var(--surface-2)" : "var(--surface)",
        }}
      >
        <Upload size={32} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
          Drop challan images here or click to browse
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          PNG, JPG, WEBP · Up to 10 images · Max 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files || []))}
        />
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-5">
          {files.map((f, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden" style={{ aspectRatio: "4/3", background: "var(--surface-2)" }}>
              <img src={previews[idx]} alt={f.name} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-xs truncate"
                style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                {f.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scan button */}
      {files.length > 0 && (
        <div className="flex gap-3 mb-8">
          <button onClick={scan} disabled={scanning} className="btn btn-primary">
            <ScanLine size={16} />
            {scanning ? `Scanning ${files.length} image${files.length > 1 ? "s" : ""}...` : `Scan ${files.length} image${files.length > 1 ? "s" : ""}`}
          </button>
          <button onClick={() => { setFiles([]); setPreviews([]); setResults([]); }} className="btn btn-ghost">
            <X size={14} /> Clear All
          </button>
        </div>
      )}

      {/* Scanning indicator */}
      {scanning && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text)" }}>
            AI is reading the challans... This may take a moment.
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>
            Scan Results ({results.length})
          </h3>
          <div className="space-y-3">
            {results.map((r, idx) => (
              <div
                key={idx}
                className="rounded-xl p-4 flex items-start gap-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0"
                  style={{ background: "var(--surface-2)" }}>
                  <img
                    src={r.imageUrl ? `${API_URL}${r.imageUrl}` : previews[idx]}
                    alt="challan"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {r.error ? (
                    <div className="flex items-center gap-2" style={{ color: "var(--danger)" }}>
                      <AlertTriangle size={16} />
                      <span className="text-sm">{r.error}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: "var(--text)" }}>
                          {r.extractedData.customerName || "Unknown Customer"}
                        </span>
                        {confidenceBadge(r.matchConfidence)}
                        {r.matchedCustomer && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            → {r.matchedCustomer.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {r.extractedData.date && `Date: ${r.extractedData.date} · `}
                        {r.extractedData.billNo && `Bill: ${r.extractedData.billNo} · `}
                        {r.extractedData.items.length} item{r.extractedData.items.length !== 1 ? "s" : ""}
                        {r.extractedData.cash ? ` · Cash: ₹${r.extractedData.cash}` : ""}
                      </p>
                    </>
                  )}
                </div>

                {!r.error && (
                  <button
                    onClick={() => setReviewIdx(idx)}
                    className="btn btn-ghost shrink-0"
                    style={{ fontSize: "12px" }}
                  >
                    Review <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewIdx !== null && results[reviewIdx] && (
        <ReviewModal
          result={results[reviewIdx]}
          customers={customers}
          onClose={() => setReviewIdx(null)}
          onConfirmed={() => {
            setResults((prev) => prev.filter((_, i) => i !== reviewIdx));
            setReviewIdx(null);
          }}
          onRejected={() => {
            setResults((prev) => prev.filter((_, i) => i !== reviewIdx));
            setReviewIdx(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  result,
  customers,
  onClose,
  onConfirmed,
  onRejected,
}: {
  result: ScanResult;
  customers: Customer[];
  onClose: () => void;
  onConfirmed: () => void;
  onRejected: () => void;
}) {
  const [form, setForm] = useState({
    customerName: result.extractedData.customerName || "",
    customerId: result.matchedCustomer?._id || "",
    date: result.extractedData.date
      ? (() => {
          // Try to parse DD-MM-YYYY or DD/MM/YY
          const raw = result.extractedData.date;
          const parts = raw.split(/[-\/]/);
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const year = y.length === 2 ? `20${y}` : y;
            return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
          return new Date().toISOString().slice(0, 10);
        })()
      : new Date().toISOString().slice(0, 10),
    billNo: result.extractedData.billNo || "",
    paymentType: result.extractedData.paymentType || "item",
    cash: result.extractedData.cash || 0,
    returnAmount: result.extractedData.returnAmount || 0,
    remarks: result.extractedData.remarks || "",
  });
  const [items, setItems] = useState(
    result.extractedData.items.length > 0
      ? result.extractedData.items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
          amount: i.amount,
          serialNumbers: i.serialNumbers?.join(", ") || "",
        }))
      : [{ description: "", qty: 0, unitPrice: 0, amount: 0, serialNumbers: "" }]
  );
  const [saving, setSaving] = useState(false);
  // Track if we need match confirmation
  const [needsMatchConfirm, setNeedsMatchConfirm] = useState(
    result.matchConfidence === "medium" && !form.customerId
  );

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    width: "100%",
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await pendingApi.confirm(result.pendingEntryId, {
        customerId: form.customerId || null,
        customerName: form.customerName,
        date: form.date,
        billNo: form.billNo,
        paymentType: form.paymentType,
        cash: Number(form.cash),
        returnAmount: Number(form.returnAmount),
        remarks: form.remarks,
        items: items
          .filter((i) => i.description)
          .map((i) => ({
            description: i.description,
            qty: Number(i.qty),
            unitPrice: Number(i.unitPrice),
            amount: Number(i.amount) || Number(i.qty) * Number(i.unitPrice),
            serialNumbers: i.serialNumbers ? i.serialNumbers.split(",").map((s) => s.trim()) : [],
          })),
      });
      onConfirmed();
    } catch {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    await pendingApi.reject(result.pendingEntryId);
    onRejected();
  };

  // If medium confidence, show confirmation first
  if (needsMatchConfirm) {
    return (
      <Modal title="Confirm Customer Match" onClose={onClose} size="sm">
        <p className="mb-4 text-sm" style={{ color: "var(--text)" }}>
          The AI detected the name <strong>"{result.extractedData.customerName}"</strong>.
          Is this the same as <strong>"{result.matchedCustomer?.name}"</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              set("customerId", "");
              set("customerName", result.extractedData.customerName);
              setNeedsMatchConfirm(false);
            }}
            className="btn btn-ghost"
          >
            No, different customer
          </button>
          <button
            onClick={() => {
              set("customerId", result.matchedCustomer!._id);
              set("customerName", result.matchedCustomer!.name);
              setNeedsMatchConfirm(false);
            }}
            className="btn btn-primary"
          >
            Yes, it's {result.matchedCustomer?.name}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Review Extracted Data" onClose={onClose} size="lg">
      <div className="flex gap-4 mb-5">
        {/* Thumbnail */}
        <img
          src={result.imageUrl ? `${API_URL}${result.imageUrl}` : ""}
          alt="challan"
          className="w-28 h-28 object-cover rounded-lg shrink-0"
          style={{ background: "var(--surface-2)" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Customer</label>
              <select style={inputStyle} value={form.customerId} onChange={(e) => {
                const c = customers.find((c) => c._id === e.target.value);
                setForm((f) => ({ ...f, customerId: e.target.value, customerName: c?.name || f.customerName }));
              }}>
                <option value="">-- Undefined / Not in list --</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name (on challan)</label>
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
        </div>
      </div>

      {/* Items */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>ITEMS</label>
          <button
            onClick={() => setItems([...items, { description: "", qty: 0, unitPrice: 0, amount: 0, serialNumbers: "" }])}
            className="btn btn-ghost"
            style={{ fontSize: "11px", padding: "3px 8px" }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-1 text-xs font-semibold mb-1 px-1" style={{ color: "var(--text-muted)" }}>
            <span className="col-span-4">Description</span>
            <span className="col-span-3">Serial #</span>
            <span className="col-span-1 text-right">Qty</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Amount</span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 items-center">
              <input className="col-span-4" style={inputStyle} value={item.description}
                onChange={(e) => { const c = [...items]; c[idx].description = e.target.value; setItems(c); }} />
              <input className="col-span-3" style={inputStyle} placeholder="Serial #s" value={item.serialNumbers}
                onChange={(e) => { const c = [...items]; c[idx].serialNumbers = e.target.value; setItems(c); }} />
              <input className="col-span-1" type="number" style={{ ...inputStyle, textAlign: "right" }} value={item.qty}
                onChange={(e) => {
                  const c = [...items]; c[idx].qty = Number(e.target.value);
                  c[idx].amount = c[idx].qty * c[idx].unitPrice; setItems(c);
                }} />
              <input className="col-span-2" type="number" style={{ ...inputStyle, textAlign: "right" }} value={item.unitPrice}
                onChange={(e) => {
                  const c = [...items]; c[idx].unitPrice = Number(e.target.value);
                  c[idx].amount = c[idx].qty * c[idx].unitPrice; setItems(c);
                }} />
              <div className="col-span-2 flex gap-1">
                <input type="number" style={{ ...inputStyle, textAlign: "right" }} value={item.amount}
                  onChange={(e) => { const c = [...items]; c[idx].amount = Number(e.target.value); setItems(c); }} />
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1" style={{ color: "var(--danger)" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="grid grid-cols-3 gap-3 mb-5">
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

      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={handleReject} className="btn btn-ghost" style={{ color: "var(--danger)" }}>
          <X size={14} /> Reject
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="btn btn-primary">
            <CheckCircle size={15} /> {saving ? "Saving..." : "Confirm & Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
