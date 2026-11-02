
import mongoose from "mongoose";

const pendingEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Raw extracted data from AI
    extractedData: {
      customerName: { type: String, default: "" },
      customerPhone: { type: String, default: "" },
      date: { type: String, default: "" },
      billNo: { type: String, default: "" },
      items: { type: Array, default: [] },
      cash: { type: Number, default: 0 },
      returnAmount: { type: Number, default: 0 },
      paymentType: { type: String, default: "item" },
      remarks: { type: String, default: "" },
    },

    // Customer matching result
    matchedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    matchedCustomerName: { type: String, default: "" },
    matchConfidence: { type: String, enum: ["high", "medium", "low", "none"], default: "none" },
    matchMethod: { type: String, default: "" }, // "phone", "exact", "alias", "fuzzy"

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    
    imageUrl: { type: String, default: "" },
    originalFilename: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("PendingEntry", pendingEntrySchema);
