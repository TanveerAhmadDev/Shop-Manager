import { Router } from "express";

import {
  loginSystemAdmin,
  logoutSystemAdmin,
  getSystemAdminProfile,
} from "../controllers/system-admin-auth.controller.js";

import { authenticateSystemAdmin } from "../middlewares/system-admin.middleware.js";

const router = Router();

// Public login route.
router.post("/login", loginSystemAdmin);

// Protected routes.
router.post("/logout", authenticateSystemAdmin, logoutSystemAdmin);
router.get("/me", authenticateSystemAdmin, getSystemAdminProfile);

export default router;
