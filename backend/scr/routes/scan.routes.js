
import express from "express";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { extractChallanData } from "../services/groqService.js";
import { matchCustomer } from "../services/customerMatcher.js";
import Customer from "../models/Customer.js";
import PendingEntry from "../models/PendingEntry.js";

const router = express.Router();
router.use(requireAuth);

// POST /api/scan — upload 1 or more challan images
// Field name: "challans" (multipart/form-data)
router.post("/", upload.array("challans", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No images uploaded" });
  }

  const userId = req.user.userId;
  const customers = await Customer.find({ userId });

  const results = [];

  for (const file of req.files) {
    try {
      // Extract data using AI
      const extractedData = await extractChallanData(file.path);

      // Match customer
      const { customer, confidence, method } = matchCustomer(customers, {
        name: extractedData.customerName,
        phone: extractedData.customerPhone,
      });

      // Create pending entry
      const entry = await PendingEntry.create({
        userId,
        extractedData,
        matchedCustomerId: customer?._id ?? null,
        matchedCustomerName: customer?.name ?? "",
        matchConfidence: confidence,
        matchMethod: method,
        status: "pending",
        imageUrl: `/uploads/${file.filename}`,
        originalFilename: file.originalname,
      });

      results.push({
        pendingEntryId: entry._id,
        extractedData,
        matchedCustomer: customer
          ? { _id: customer._id, name: customer.name, phone: customer.phone }
          : null,
        matchConfidence: confidence,
        matchMethod: method,
        imageUrl: entry.imageUrl,
      });
    } catch (err) {
      console.error(`Error processing ${file.originalname}:`, err);
      results.push({
        error: err.message,
        filename: file.originalname,
      });
    } finally {
      // Clean up temp file after processing (optional: keep for display)
    }
  }

  res.json({ results });
});

export default router;
