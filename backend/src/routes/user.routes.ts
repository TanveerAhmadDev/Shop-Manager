import { Router } from "express";

import {
  getShopUsers,
  createHelper,
  updateHelperStatus,
} from "../controllers/user.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

// Every route requires authentication.
router.use(authenticate);

// Owner-only operations.
router.get("/", authorizeRoles("owner"), getShopUsers);

router.post("/helpers", authorizeRoles("owner"), createHelper);

router.patch(
  "/helpers/:userId/status",
  authorizeRoles("owner"),
  updateHelperStatus,
);

export default router;
