import { Router } from "express";

import {
  createExpenseCategory,
  getExpenseCategories,
} from "../controllers/expenseCategories.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", authorizeRoles("owner", "helper"), getExpenseCategories);

router.post("/", authorizeRoles("owner"), createExpenseCategory);

export default router;
