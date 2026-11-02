
import express from "express";
import Transaction from "../models/Transaction.js";
import Customer from "../models/Customer.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/transactions?customer=id&from=date&to=date&type=item|cash|upi|neft&search=text
router.get("/", async (req, res) => {
  const { customer, from, to, type, search } = req.query;
  const filter = { userId: req.user.userId };

  if (customer && customer !== "all") filter.customerId = customer;
  if (type) filter.paymentType = type;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [
      { customerName: re },
      { billNo: re },
      { remarks: re },
      { "items.description": re },
    ];
  }

  const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
  res.json(transactions);
});

// GET /api/transactions/summary — stats for dashboard
router.get("/summary", async (req, res) => {
  const userId = req.user.userId;
  const [total, pending] = await Promise.all([
    Transaction.countDocuments({ userId }),
    Transaction.countDocuments({ userId, paymentType: "item" }),
  ]);
  const customers = await Customer.countDocuments({ userId });
  res.json({ totalTransactions: total, itemEntries: pending, customers });
});

// POST /api/transactions — create one transaction
router.post("/", async (req, res) => {
  const data = { ...req.body, userId: req.user.userId };
  const transaction = await Transaction.create(data);
  // Recalculate running balance for this customer
  await recalcBalance(req.user.userId, transaction.customerId);
  const updated = await Transaction.findById(transaction._id);
  res.status(201).json(updated);
});

// POST /api/transactions/bulk — create multiple transactions
router.post("/bulk", async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: "transactions array required" });
  }
  const docs = transactions.map((t) => ({ ...t, userId: req.user.userId }));
  const created = await Transaction.insertMany(docs);

  // Recalc balance per unique customer
  const customerIds = [...new Set(created.map((t) => t.customerId?.toString()).filter(Boolean))];
  await Promise.all(customerIds.map((cid) => recalcBalance(req.user.userId, cid)));

  res.status(201).json(created);
});

// PUT /api/transactions/:id — update one
router.put("/:id", async (req, res) => {
  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  await recalcBalance(req.user.userId, tx.customerId);
  const updated = await Transaction.findById(tx._id);
  res.json(updated);
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  if (tx.customerId) await recalcBalance(req.user.userId, tx.customerId);
  res.json({ success: true });
});

// Recalculate running balance for a customer (sorted by date asc)
async function recalcBalance(userId, customerId) {
  if (!customerId) return;
  const txns = await Transaction.find({ userId, customerId }).sort({ date: 1, createdAt: 1 });

  let balance = 0;
  for (const tx of txns) {
    const itemTotal = (tx.items || []).reduce((s, i) => s + (i.amount || 0), 0);
    const payment = tx.cash || 0;
    const ret = tx.returnAmount || 0;
    balance = balance + itemTotal - payment - ret;
    tx.runningBalance = balance;
    await tx.save();
  }
}

export default router;
