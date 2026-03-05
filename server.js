import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.js";
import qrCodeRoutes from "./routes/qrCodes.js";
import scanRoutes from "./routes/scans.js";
import contactRoutes from "./routes/contacts.js";
import uploadsRoutes from "./routes/uploads.js";
import redirectRoutes from "./routes/redirects.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import webhookRoutes from "./routes/webhooks.js";
import { connectDB } from "./config/db.js";
import { scheduleCleanup } from "./utils/cleanupTasks.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3000/",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:8081",
      "https://qrstudio.daorbit.in/",
      "https://qr-studio-pro-orpin.vercel.app/",
      "https://lovable.dev",
      "https://lovable.dev/projects/9d155ac2-83d3-4dea-ba6d-bd4dadc5df2f",
      "https://id-preview--9d155ac2-83d3-4dea-ba6d-bd4dadc5df2f.lovable.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// Increase payload size limit to handle base64 encoded images (20MB limit)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/qrcodes", qrCodeRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Redirect route for scanned QR codes (public)
app.use("/r", redirectRoutes);

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Global error handler (returns JSON)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(err?.status || 500)
    .json({ message: err?.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Start scheduled cleanup of expired orders, trials, and subscriptions
  scheduleCleanup();
  console.log(
    "✅ Trial system activated: New users get 3 months free pro features",
  );
  console.log(
    "⏰ Cleanup tasks scheduled: Orders, trials, and subscription expiry",
  );
});
