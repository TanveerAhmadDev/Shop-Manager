import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/v1/dashboard/summary
router.get("/summary", authenticate, getDashboardSummary);

export default router;
