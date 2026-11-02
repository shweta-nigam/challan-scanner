
import express from "express";
import PendingEntry from "../models/PendingEntry.js";
import Transaction from "../models/Transaction.js";
import Customer from "../models/Customer.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/pending — list pending entries for this user
router.get("/", async (req, res) => {
  const entries = await PendingEntry.find({
    userId: req.user.userId,
    status: "pending",
  }).sort({ createdAt: -1 });
  res.json(entries);
});

// PUT /api/pending/:id/confirm — user confirms/edits the entry
router.put("/:id/confirm", async (req, res) => {
  const entry = await PendingEntry.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  const {
    customerId,
    customerName,
    date,
    billNo,
    items,
    cash,
    returnAmount,
    paymentType,
    upiRef,
    neftRef,
    remarks,
  } = req.body;

  // Create transaction
  const transaction = await Transaction.create({
    userId: req.user.userId,
    customerId: customerId || null,
    customerName: customerName || entry.extractedData.customerName || "Unknown",
    date: date ? new Date(date) : new Date(),
    billNo: billNo || entry.extractedData.billNo || "",
    items: items || entry.extractedData.items || [],
    cash: cash ?? entry.extractedData.cash ?? 0,
    returnAmount: returnAmount ?? entry.extractedData.returnAmount ?? 0,
    paymentType: paymentType || entry.extractedData.paymentType || "item",
    upiRef: upiRef || entry.extractedData.upiRef || "",
    neftRef: neftRef || entry.extractedData.neftRef || "",
    remarks: remarks || entry.extractedData.remarks || "",
  });

  // Recalc balance
  if (customerId) {
    await recalcBalance(req.user.userId, customerId);
  }

  entry.status = "confirmed";
  await entry.save();

  res.json({ success: true, transaction });
});

// PUT /api/pending/:id/reject
router.put("/:id/reject", async (req, res) => {
  const entry = await PendingEntry.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  entry.status = "rejected";
  await entry.save();
  res.json({ success: true });
});

// PUT /api/pending/:id — update extracted data before confirming
router.put("/:id", async (req, res) => {
  const entry = await PendingEntry.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  Object.assign(entry.extractedData, req.body.extractedData || {});
  if (req.body.matchedCustomerId !== undefined) entry.matchedCustomerId = req.body.matchedCustomerId;
  if (req.body.matchedCustomerName !== undefined) entry.matchedCustomerName = req.body.matchedCustomerName;
  await entry.save();
  res.json(entry);
});

// Helper: recalc running balance
async function recalcBalance(userId, customerId) {
  const txns = await Transaction.find({ userId, customerId }).sort({ date: 1, createdAt: 1 });
  let balance = 0;
  for (const tx of txns) {
    const itemTotal = (tx.items || []).reduce((s, i) => s + (i.amount || 0), 0);
    balance = balance + itemTotal - (tx.cash || 0) - (tx.returnAmount || 0);
    tx.runningBalance = balance;
    await tx.save();
  }
}

export default router;
