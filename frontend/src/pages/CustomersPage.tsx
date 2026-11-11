import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Search, Phone, Tag, X, Check } from "lucide-react";
import { customersApi } from "../api/customers";
import type { Customer } from "../api/customers";
import Modal from "../components/UI/Modal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.list();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setShowModal(true); };

  const handleDelete = async (id: string) => {
    await customersApi.remove(id);
    setCustomers((prev) => prev.filter((c) => c._id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Customers</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your customer list. Names here are used for automatic matching.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5" style={{ maxWidth: "340px" }}>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, alias..."
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: "8px",
            padding: "8px 10px 8px 30px",
            fontSize: "13px",
            width: "100%",
          }}
        />
      </div>

      {/* Customer list */}
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {search ? "No customers match your search." : "No customers yet. Click 'Add Customer' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c._id}
              className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{c.name}</h3>
                  {c.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone size={11} style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="btn btn-ghost p-1.5" style={{ border: "none" }}>
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(c._id)}
                    className="btn btn-ghost p-1.5"
                    style={{ border: "none", color: "var(--danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Aliases */}
              {c.aliases.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <Tag size={11} style={{ color: "var(--text-muted)" }} className="mt-0.5" />
                  {c.aliases.map((a) => (
                    <span
                      key={a}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {c.notes && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{c.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Customer form modal */}
      {showModal && (
        <CustomerFormModal
          customer={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Modal title="Delete Customer" onClose={() => setDeleteConfirm(null)} size="sm">
          <p className="mb-5 text-sm" style={{ color: "var(--text-muted)" }}>
            Are you sure you want to delete this customer? Their transactions will remain but become unlinked.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CustomerFormModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [aliases, setAliases] = useState<string[]>(customer?.aliases || []);
  const [aliasInput, setAliasInput] = useState("");
  const [notes, setNotes] = useState(customer?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "13px",
    width: "100%",
  };

  const addAlias = () => {
    const a = aliasInput.trim();
    if (a && !aliases.includes(a)) setAliases((prev) => [...prev, a]);
    setAliasInput("");
  };

  const submit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      if (customer) {
        await customersApi.update(customer._id, { name, phone, aliases, notes });
      } else {
        await customersApi.create({ name, phone, aliases, notes });
      }
      onSaved();
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={customer ? "Edit Customer" : "Add Customer"} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <p className="text-sm p-2 rounded" style={{ background: "var(--danger)", color: "#fff" }}>{error}</p>
        )}

        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name *</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer or dealer name" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Phone Number</label>
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
            Aliases / Alternate Names
          </label>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Add any other names or short forms this customer might be written as on challans.
          </p>
          <div className="flex gap-2 mb-2">
            <input
              style={{ ...inputStyle, width: "auto", flex: 1 }}
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
              placeholder="Type alias and press Enter"
            />
            <button onClick={addAlias} className="btn btn-ghost">Add</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {aliases.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface-2)", color: "var(--text)" }}
              >
                {a}
                <button onClick={() => setAliases((prev) => prev.filter((x) => x !== a))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Notes</label>
          <textarea
            style={{ ...inputStyle, height: "60px", resize: "none" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this customer"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            <Check size={15} /> {saving ? "Saving..." : customer ? "Update" : "Add Customer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
