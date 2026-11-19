import { Router } from "express";

import { getSystemAdminDashboard } from "../controllers/system-admin-dashboard.controller.js";
import { authenticateSystemAdmin } from "../middlewares/system-admin.middleware.js";

const router = Router();

// Every dashboard request requires System Admin authentication.
router.use(authenticateSystemAdmin);

router.get("/summary", getSystemAdminDashboard);

export default router;
