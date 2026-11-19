import { Router } from "express";

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/suppliers.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

// All supplier routes require authentication.
router.use(authenticate);

// Owner and helper permissions.
router.post("/", authorizeRoles("owner"), createSupplier);

router.get("/", authorizeRoles("owner", "helper"), getSuppliers);

router.get("/:supplierId", authorizeRoles("owner", "helper"), getSupplierById);

router.patch("/:supplierId", authorizeRoles("owner", "helper"), updateSupplier);

// Deleting suppliers is restricted to owners.
router.delete("/:supplierId", authorizeRoles("owner"), deleteSupplier);

export default router;
