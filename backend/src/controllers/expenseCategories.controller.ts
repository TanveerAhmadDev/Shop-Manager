import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db.js";

const validTypes = ["business", "personal"];

// CREATE CATEGORY
export const createExpenseCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;

    const { category_name, expense_type } = req.body;

    if (typeof category_name !== "string" || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    if (!validTypes.includes(expense_type)) {
      return res.status(400).json({
        success: false,
        message: "Expense type must be business or personal.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO expense_categories (
        shop_id,
        category_name,
        expense_type
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [shopId, category_name.trim(), expense_type],
    );

    return res.status(201).json({
      success: true,
      message: "Expense category created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET CATEGORIES
export const getExpenseCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;

    const expenseType =
      typeof req.query.expense_type === "string" ? req.query.expense_type : "";

    if (expenseType && !validTypes.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense type.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        ec.id,
        ec.category_name,
        ec.expense_type,
        ec.created_at,
        COUNT(e.id)::int AS expense_count

      FROM expense_categories ec

      LEFT JOIN expenses e
        ON e.category_id = ec.id
        AND e.shop_id = ec.shop_id

      WHERE ec.shop_id = $1
        AND ($2 = '' OR ec.expense_type = $2)

      GROUP BY ec.id

      ORDER BY ec.expense_type, ec.category_name
      `,
      [shopId, expenseType],
    );

    return res.status(200).json({
      success: true,
      message: "Expense categories fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};
