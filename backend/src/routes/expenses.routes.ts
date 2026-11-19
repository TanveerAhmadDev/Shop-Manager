import { Router } from "express";

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from "../controllers/expenses.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", authorizeRoles("owner", "helper"), createExpense);

// Keep summary before /:expenseId.
router.get("/summary", authorizeRoles("owner"), getExpenseSummary);

router.get("/", authorizeRoles("owner"), getExpenses);

router.get("/:expenseId", authorizeRoles("owner", "helper"), getExpenseById);

router.patch("/:expenseId", authorizeRoles("owner"), updateExpense);

router.delete("/:expenseId", authorizeRoles("owner"), deleteExpense);

export default router;
