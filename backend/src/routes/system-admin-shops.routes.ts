import { Router } from "express";

import {
  createShop,
  getAllShops,
  getShopById,
  updateShopPrintingPermission,
  updateShopStatus,
} from "../controllers/system-admin-shops.controller.js";

import { authenticateSystemAdmin } from "../middlewares/system-admin.middleware.js";

const router = Router();

// Every shop-management endpoint requires System Admin authentication.
router.use(authenticateSystemAdmin);

// Shop management.
router.post("/", createShop);
router.get("/", getAllShops);
router.get("/:shopId", getShopById);
router.patch("/:shopId/status", updateShopStatus);
router.patch("/:shopId/printing", updateShopPrintingPermission);

export default router;
