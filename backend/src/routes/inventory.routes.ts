import { Router } from "express";

import {
  getInventory,
  getInventoryById,
  updateInventoryStatus,
  getInventoryAdjustments,
  getInventoryItemAdjustments,
  getInventoryByModelNumber,
} from "../controllers/inventory.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// Owner and helper can view inventory
router.get("/", authorizeRoles("owner", "helper"), getInventory);

router.get(
  "/adjustments",
  authorizeRoles("owner", "helper"),
  getInventoryAdjustments,
);
router.get("/model/:modelNumber", getInventoryByModelNumber);

router.get(
  "/:inventoryId/adjustments",
  authorizeRoles("owner", "helper"),
  getInventoryItemAdjustments,
);

router.get(
  "/:inventoryId",
  authorizeRoles("owner", "helper"),
  getInventoryById,
);

// Owner and helper can make permitted status adjustments
router.patch(
  "/:inventoryId/status",
  authorizeRoles("owner", "helper"),
  updateInventoryStatus,
);

export default router;
