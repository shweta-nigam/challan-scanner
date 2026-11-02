
import express from "express";
import Customer from "../models/Customer.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// GET /api/customers — list all customers for this user
router.get("/", async (req, res) => {
  const customers = await Customer.find({ userId: req.user.userId }).sort({ name: 1 });
  res.json(customers);
});

// POST /api/customers — create a new customer
router.post("/", async (req, res) => {
  const { name, phone, aliases, notes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const customer = await Customer.create({
    userId: req.user.userId,
    name: name.trim(),
    phone: phone?.trim() ?? "",
    aliases: Array.isArray(aliases) ? aliases.map((a) => a.trim()).filter(Boolean) : [],
    notes: notes ?? "",
  });
  res.status(201).json(customer);
});

// PUT /api/customers/:id — update customer
router.put("/:id", async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const { name, phone, aliases, notes } = req.body;
  if (name) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone.trim();
  if (aliases !== undefined)
    customer.aliases = Array.isArray(aliases) ? aliases.map((a) => a.trim()).filter(Boolean) : [];
  if (notes !== undefined) customer.notes = notes;

  await customer.save();
  res.json(customer);
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
  const result = await Customer.deleteOne({ _id: req.params.id, userId: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Customer not found" });
  res.json({ success: true });
});

export default router;
