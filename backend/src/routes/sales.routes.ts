import { Router } from "express";

import { createSale } from "../controllers/sales.controller.js";
import {
  getSales,
  getSaleById,
} from "../controllers/sales.query.controller.js";
import { addSalePayment } from "../controllers/payments.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";
import {
  completeSaleReturn,
  createSaleReturn,
  getSaleReturnById,
  getSaleReturns,
  inspectSaleReturn,
} from "../controllers/sales-returns.controller.js";

const router = Router();

// All sales routes require authentication
router.use(authenticate);

// Owner and helper can manage sales
router.use(authorizeRoles("owner", "helper"));

// Create a new bill
router.post("/", createSale);

// Get all bills
router.get("/", getSales);

// Get one bill with its items and payments

// Record an additional payment
router.post(
  "/:saleId/payments",
  authenticate,
  authorizeRoles("owner", "helper"),
  addSalePayment,
);
router.get("/returns", getSaleReturns);

router.get("/returns/:returnId", getSaleReturnById);

router.patch("/returns/:returnId/inspect", inspectSaleReturn);
router.post(
  "/returns/:returnId/complete",
  authorizeRoles("owner"),
  completeSaleReturn,
);
router.post("/:saleId/returns", createSaleReturn);

router.get("/:saleId", getSaleById);

export default router;
