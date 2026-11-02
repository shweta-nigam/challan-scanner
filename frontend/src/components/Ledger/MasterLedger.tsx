import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Copy,
  Plus,
  Filter,
  Edit3,
  Trash2,
  Check,
  X,
  ClipboardList,
} from "lucide-react";
import { transactionsApi, Transaction, TransactionFilters } from "../../api/transactions";
import { customersApi, Customer } from "../../api/customers";
import Modal from "../UI/Modal";

type SortField = "date" | "billNo" | "customerName" | "runningBalance";

function fmt(date: string) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtNum(n: number) {
  if (!n && n !== 0) return "";
  if (n === 0) return "";
  return n.toLocaleString("en-IN");
}

export default function MasterLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: TransactionFilters = {};
      if (filterCustomer !== "all") filters.customer = filterCustomer;
      if (filterType) filters.type = filterType;
      if (filterFrom) filters.from = filterFrom;
      if (filterTo) filters.to = filterTo;
      if (search) filters.search = search;
      const [txns, custs] = await Promise.all([
        transactionsApi.list(filters),
        customersApi.list(),
      ]);
      setTransactions(txns);
      setCustomers(custs);
    } finally {
      setLoading(false);
    }
  }, [filterCustomer, filterType, filterFrom, filterTo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sort
  const sorted = [...transactions].sort((a, b) => {
    let av: string | number = a[sortField as keyof Transaction] as string | number;
    let bv: string | number = b[sortField as keyof Transaction] as string | number;
    if (sortField === "date") { av = new Date(a.date).getTime(); bv = new Date(b.date).getTime(); }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  // Group by customer (undefined customers at end)
  const customerMap = new Map<string, Transaction[]>();
  const undefinedTxns: Transaction[] = [];
  
  for (const tx of sorted) {
    if (tx.customerId) {
      const key = tx.customerId;
      if (!customerMap.has(key)) customerMap.set(key, []);
      customerMap.get(key)!.push(tx);
    } else {
      undefinedTxns.push(tx);
    }
  }

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  // Toggle row selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Copy selected rows to clipboard (tab-separated, Excel-compatible)
  const copySelected = async () => {
    const rows = sorted.filter((t) => selected.has(t._id));
    const header = "Date\tBill No\tCustomer\tItem\tQty\tPrice\tAmount\tCash\tReturn\tBalance\tRemarks";
    const lines = rows.flatMap((t) => {
      if (t.items.length === 0) {
        return [`${fmt(t.date)}\t${t.billNo}\t${t.customerName}\t\t\t\t\t${t.cash || ""}\t${t.returnAmount || ""}\t${t.runningBalance}\t${t.remarks}`];
      }
      return t.items.map((item, i) => {
        const isFirst = i === 0;
        return `${isFirst ? fmt(t.date) : ""}\t${isFirst ? t.billNo : ""}\t${isFirst ? t.customerName : ""}\t${item.description}\t${item.qty || ""}\t${item.unitPrice || ""}\t${item.amount || ""}\t${isFirst ? (t.cash || "") : ""}\t${isFirst ? (t.returnAmount || "") : ""}\t${isFirst ? t.runningBalance : ""}\t${isFirst ? t.remarks : ""}`;
      });
    });
    await navigator.clipboard.writeText([header, ...lines].join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline edit save
  const saveEdit = async (id: string, field: string, value: string) => {
    try {
      const numFields = ["cash", "returnAmount", "runningBalance"];
      const payload: Record<string, unknown> = {};
      payload[field] = numFields.includes(field) ? parseFloat(value) || 0 : value;
      await transactionsApi.update(id, payload);
      setTransactions((prev) =>
        prev.map((t) => (t._id === id ? { ...t, [field]: payload[field] } : t))
      );
    } catch {}
    setEditingCell(null);
  };

  const startEdit = (id: string, field: string, current: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(current));
  };

  const handleDelete = async (id: string) => {
    await transactionsApi.remove(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
    setDeleteConfirm(null);
  };

  const EditableCell = ({
    id,
    field,
    value,
    numeric,
  }: {
    id: string;
    field: string;
    value: string | number;
    numeric?: boolean;
  }) => {
    const isEditing = editingCell?.id === id && editingCell?.field === field;
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="cell-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(id, field, editValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit(id, field, editValue);
            if (e.key === "Escape") setEditingCell(null);
          }}
          style={{ textAlign: numeric ? "right" : "left" }}
        />
      );
    }
    return (
      <span
        onClick={() => startEdit(id, field, value)}
        className="cursor-text hover:underline decoration-dashed"
        title="Click to edit"
      >
        {numeric ? fmtNum(value as number) : (value as string)}
      </span>
    );
  };

  const headers: { label: string; key?: SortField; right?: boolean }[] = [
    { label: "" },
    { label: "Date", key: "date" },
    { label: "Bill No", key: "billNo" },
    { label: "Customer", key: "customerName" },
    { label: "Item / Description" },
    { label: "Serial #" },
    { label: "Qty", right: true },
    { label: "Price", right: true },
    { label: "Amount", right: true },
    { label: "Cash", right: true },
    { label: "Return", right: true },
    { label: "Remarks" },
    { label: "Balance", key: "runningBalance", right: true },
    { label: "" },
  ];

  const renderRows = (txns: Transaction[]) =>
    txns.map((tx) => {
      const rowCount = Math.max(tx.items.length, 1);
      const isSel = selected.has(tx._id);
      return Array.from({ length: rowCount }).map((_, i) => {
        const item = tx.items[i];
        const isFirst = i === 0;
        return (
          <tr
            key={`${tx._id}-${i}`}
            className={isSel ? "selected" : ""}
            style={{ color: "var(--text)" }}
          >
            {isFirst && (
              <td rowSpan={rowCount} style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggleSelect(tx._id)}
                />
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount}>
                <EditableCell id={tx._id} field="date" value={fmt(tx.date)} />
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount}>
                <EditableCell id={tx._id} field="billNo" value={tx.billNo} />
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount}>
                <EditableCell id={tx._id} field="customerName" value={tx.customerName} />
              </td>
            )}
            <td>{item ? <EditableCell id={tx._id} field={`items.${i}.description`} value={item.description} /> : null}</td>
            <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              {item?.serialNumbers?.join(", ")}
            </td>
            <td style={{ textAlign: "right" }}>{item ? fmtNum(item.qty) : null}</td>
            <td style={{ textAlign: "right" }}>{item ? fmtNum(item.unitPrice) : null}</td>
            <td style={{ textAlign: "right" }}>{item ? fmtNum(item.amount) : null}</td>
            {isFirst && (
              <td rowSpan={rowCount} style={{ textAlign: "right" }}>
                <EditableCell id={tx._id} field="cash" value={tx.cash} numeric />
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount} style={{ textAlign: "right" }}>
                <EditableCell id={tx._id} field="returnAmount" value={tx.returnAmount} numeric />
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount}>
                <EditableCell id={tx._id} field="remarks" value={tx.remarks} />
              </td>
            )}
            {isFirst && (
              <td
                rowSpan={rowCount}
                style={{ textAlign: "right", fontWeight: 600 }}
              >
                {fmtNum(tx.runningBalance)}
              </td>
            )}
            {isFirst && (
              <td rowSpan={rowCount} style={{ textAlign: "center" }}>
                <button
                  onClick={() => setDeleteConfirm(tx._id)}
                  className="btn btn-ghost p-1"
                  style={{ border: "none", color: "var(--danger)" }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            )}
          </tr>
        );
      });
    });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "8px",
                padding: "6px 10px 6px 28px",
                fontSize: "13px",
                width: "200px",
              }}
            />
          </div>

          {/* Customer filter */}
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "13px",
            }}
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
            <option value="undefined">Undefined</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-ghost"
          >
            <Filter size={14} /> Filters
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={copySelected} className="btn btn-ghost">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : `Copy ${selected.size} row${selected.size > 1 ? "s" : ""}`}
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={15} /> Add Entry
          </button>
        </div>
      </div>

      {/* Date/type filters row */}
      {showFilters && (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
        >
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "12px",
            }}
          >
            <option value="">All Types</option>
            <option value="item">Item</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="neft">NEFT</option>
          </select>
          <button
            onClick={() => {
              setFilterFrom(""); setFilterTo(""); setFilterType(""); setSearch(""); setFilterCustomer("all");
            }}
            className="btn btn-ghost"
            style={{ fontSize: "12px", padding: "4px 10px" }}
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-40" style={{ color: "var(--text-muted)" }}>
            Loading...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--text-muted)" }}>
            <ClipboardList size={32} />
            <p>No entries yet. Upload a challan to get started.</p>
          </div>
        ) : (
          <table className="ledger-table w-full border-collapse" style={{ background: "var(--surface)" }}>
            <thead>
              <tr>
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    onClick={() => h.key && toggleSort(h.key)}
                    style={{
                      textAlign: h.right ? "right" : "left",
                      cursor: h.key ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    {h.label}
                    {h.key && sortField === h.key && (sortAsc ? " ↑" : " ↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Customer sections */}
              {Array.from(customerMap.entries()).map(([custId, txns]) => {
                const cust = customers.find((c) => c._id === custId);
                return (
                  <React.Fragment key={custId}>
                    <tr className="customer-header-row">
                      <td colSpan={headers.length}>
                        {cust?.name || "Customer"}{cust?.phone ? ` (${cust.phone})` : ""}
                      </td>
                    </tr>
                    {renderRows(txns)}
                  </React.Fragment>
                );
              })}

              {/* Undefined customers */}
              {undefinedTxns.length > 0 && (
                <>
                  <tr className="customer-header-row">
                    <td colSpan={headers.length}>Undefined Dealers / Customers</td>
                  </tr>
                  {renderRows(undefinedTxns)}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Modal title="Delete Entry" onClose={() => setDeleteConfirm(null)} size="sm">
          <p style={{ color: "var(--text-muted)" }} className="mb-5">
            Are you sure you want to delete this transaction? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <AddEntryModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function AddEntryModal({
  customers,
  onClose,
  onSaved,
}: {
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    customerName: "",
    customerId: "",
    date: new Date().toISOString().slice(0, 10),
    billNo: "",
    paymentType: "item" as const,
    cash: "",
    returnAmount: "",
    remarks: "",
  });
  const [items, setItems] = useState([{ description: "", qty: "", unitPrice: "", amount: "", serialNumbers: "" }]);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCustomer = (id: string) => {
    const c = customers.find((c) => c._id === id);
    setForm((f) => ({ ...f, customerId: id, customerName: c?.name || "" }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await transactionsApi.create({
        customerId: form.customerId || null,
        customerName: form.customerName,
        date: new Date(form.date).toISOString(),
        billNo: form.billNo,
        paymentType: form.paymentType,
        cash: parseFloat(form.cash) || 0,
        returnAmount: parseFloat(form.returnAmount) || 0,
        remarks: form.remarks,
        items: items
          .filter((i) => i.description)
          .map((i) => ({
            description: i.description,
            qty: parseFloat(i.qty) || 0,
            unitPrice: parseFloat(i.unitPrice) || 0,
            amount: parseFloat(i.amount) || (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0),
            serialNumbers: i.serialNumbers ? i.serialNumbers.split(",").map((s) => s.trim()) : [],
          })),
      });
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    width: "100%",
  };

  return (
    <Modal title="Add Entry" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Customer</label>
            <select style={inputStyle} value={form.customerId} onChange={(e) => handleCustomer(e.target.value)}>
              <option value="">-- Select or type below --</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Customer Name</label>
            <input style={inputStyle} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Or type name directly" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Date</label>
            <input type="date" style={inputStyle} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Bill No</label>
            <input style={inputStyle} value={form.billNo} onChange={(e) => set("billNo", e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Payment Type</label>
            <select style={inputStyle} value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
              <option value="item">Item</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="neft">NEFT</option>
            </select>
          </div>
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

        {/* Items */}
        {form.paymentType === "item" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>ITEMS</label>
              <button
                onClick={() => setItems([...items, { description: "", qty: "", unitPrice: "", amount: "", serialNumbers: "" }])}
                className="btn btn-ghost"
                style={{ fontSize: "11px", padding: "3px 8px" }}
              >
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    style={{ ...inputStyle }}
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      const copy = [...items]; copy[idx].description = e.target.value; setItems(copy);
                    }}
                    className="col-span-2"
                  />
                  <input
                    type="number"
                    style={inputStyle}
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => {
                      const copy = [...items]; copy[idx].qty = e.target.value;
                      copy[idx].amount = String((parseFloat(e.target.value) || 0) * (parseFloat(copy[idx].unitPrice) || 0));
                      setItems(copy);
                    }}
                  />
                  <input
                    type="number"
                    style={inputStyle}
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const copy = [...items]; copy[idx].unitPrice = e.target.value;
                      copy[idx].amount = String((parseFloat(copy[idx].qty) || 0) * (parseFloat(e.target.value) || 0));
                      setItems(copy);
                    }}
                  />
                  <div className="flex gap-1">
                    <input type="number" style={inputStyle} placeholder="Amount" value={item.amount}
                      onChange={(e) => { const copy = [...items]; copy[idx].amount = e.target.value; setItems(copy); }} />
                    {items.length > 1 && (
                      <button
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="btn btn-ghost p-1.5"
                        style={{ border: "none", color: "var(--danger)" }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
