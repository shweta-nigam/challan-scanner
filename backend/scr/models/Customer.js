
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    aliases: { type: [String], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index for fast per-user queries
customerSchema.index({ userId: 1, name: 1 });

export default mongoose.model("Customer", customerSchema);
