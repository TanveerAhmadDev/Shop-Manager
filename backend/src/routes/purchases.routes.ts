import { Router } from "express";

import { createPurchase } from "../controllers/purchases.controller.js";

import {
  getPurchases,
  getPurchaseById,
} from "../controllers/purchases.query.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";
import { cancelPurchase } from "../controllers/purchases.actions.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorizeRoles("owner", "helper"));

// Create purchase
router.post("/", createPurchase);

// List purchases
router.get("/", getPurchases);

// Get one purchase with its items and inventory
router.get("/:purchaseId", getPurchaseById);

// Cancel a purchase
router.patch("/:purchaseId/cancel", cancelPurchase);

export default router;
