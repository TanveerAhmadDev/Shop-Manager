import { Router } from "express";

import { getProfitReport } from "../controllers/reports.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

// Only the shop owner can view financial reports.
router.get("/profit", authenticate, authorizeRoles("owner"), getProfitReport);

export default router;
