
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import transactionsRoutes from "./routes/transactions.routes.js";
import pendingRoutes from "./routes/pending.routes.js";
import scanRoutes from "./routes/scan.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to Challan Scanner API" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/pending", pendingRoutes);
app.use("/api/scan", scanRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

export default app;
