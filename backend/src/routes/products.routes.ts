import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
} from "../controllers/products.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

// All product routes require login
router.use(authenticate);

// Owner and helper can manage products
router.post("/", authorizeRoles("owner", "helper"), createProduct);

router.get("/", authorizeRoles("owner", "helper"), getProducts);

router.get("/:productId", authorizeRoles("owner", "helper"), getProductById);

router.patch("/:productId", authorizeRoles("owner", "helper"), updateProduct);

router.patch(
  "/:productId/status",
  authorizeRoles("owner", "helper"),
  updateProductStatus,
);

export default router;
