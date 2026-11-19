import { Router } from "express";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerPurchases,
} from "../controllers/customers.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

router.use(authenticate);

// Owner and helper can manage customers
router.post("/", authorizeRoles("owner", "helper"), createCustomer);

router.get("/", authorizeRoles("owner", "helper"), getCustomers);

// Keep the purchase-history route before the general customer detail route
router.get(
  "/:customerId/purchases",
  authorizeRoles("owner", "helper"),
  getCustomerPurchases,
);

router.get("/:customerId", authorizeRoles("owner", "helper"), getCustomerById);

router.patch("/:customerId", authorizeRoles("owner", "helper"), updateCustomer);

export default router;
