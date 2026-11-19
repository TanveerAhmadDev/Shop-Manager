import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { pool } from "./config/db.js";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import salesRouter from "./routes/sales.routes.js";
import purchasesRouter from "./routes/purchases.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import customerRoutes from "./routes/customers.routes.js";
import supplierRoutes from "./routes/suppliers.routes.js";
import expenseRoutes from "./routes/expenses.routes.js";
import expenseCategoryRoutes from "./routes/expenseCategories.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import productsRoutes from "./routes/products.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import systemAdminAuthRoutes from "./routes/system-admin-auth.routes.js";
import systemAdminShopsRoutes from "./routes/system-admin-shops.routes.js";
import systemAdminDashboardRoutes from "./routes/system-admin-dashboard.routes.js";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "http://172.22.0.1:3000",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
    : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Furniture Shop Management API is running!",
  });
});

// Database health check
app.get("/api/v1/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.status(200).json({
      success: true,
      message: "PostgreSQL connected successfully!",
      database_time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "PostgreSQL connection failed.",
    });
  }
});

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/purchases", purchasesRouter);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/expense-categories", expenseCategoryRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/system-admin/auth", systemAdminAuthRoutes);
app.use("/api/v1/system-admin/shops", systemAdminShopsRoutes);
app.use("/api/v1/system-admin/dashboard", systemAdminDashboardRoutes);

export default app;
