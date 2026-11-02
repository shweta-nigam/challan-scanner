
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, default: "" },
    serialNumbers: { type: [String], default: [] },
    qty: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, required: true, trim: true },

    date: { type: Date, required: true },
    billNo: { type: String, trim: true, default: "" },

    // Item lines
    items: { type: [itemSchema], default: [] },

    // Payment fields
    cash: { type: Number, default: 0 },
    returnAmount: { type: Number, default: 0 },
    paymentType: {
      type: String,
      enum: ["item", "cash", "upi", "neft"],
      default: "item",
    },
    upiRef: { type: String, default: "" },
    neftRef: { type: String, default: "" },

    remarks: { type: String, default: "" },
    runningBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, customerId: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);
