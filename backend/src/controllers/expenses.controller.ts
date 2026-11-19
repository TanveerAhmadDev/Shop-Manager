import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db.js";

// Allowed values
const expenseTypes = ["business", "personal"];
const paymentMethods = ["cash", "bank", "easypaisa", "jazzcash", "other"];

// Helper: get expense ID safely
const getExpenseId = (req: Request): string | null => {
  const id = req.params.expenseId;
  return typeof id === "string" ? id : null;
};

// Helper: pagination
const getPagination = (req: Request) => {
  const pageValue =
    typeof req.query.page === "string" ? Number(req.query.page) : 1;

  const limitValue =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 100)
      : 10;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

// CREATE EXPENSE
export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const userId = req.user!.userId;

    const {
      category_id,
      title,
      description,
      amount,
      expense_type,
      expense_date,
      payment_method,
      reference_number,
    } = req.body;

    if (
      (category_id !== undefined &&
        category_id !== null &&
        typeof category_id !== "string") ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and a valid positive amount are required.",
      });
    }

    // Category is now optional.
    const categoryId =
      typeof category_id === "string" && category_id.trim()
        ? category_id.trim()
        : null;

    if (!expenseTypes.includes(expense_type)) {
      return res.status(400).json({
        success: false,
        message: "Expense type must be business or personal.",
      });
    }

    if (!paymentMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    // Validate optional text fields
    for (const [field, value] of Object.entries({
      description,
      reference_number,
    })) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`,
        });
      }
    }

    const cleanDate = expense_date || null;

    if (
      cleanDate &&
      (typeof cleanDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ||
        Number.isNaN(Date.parse(`${cleanDate}T00:00:00Z`)) ||
        new Date(`${cleanDate}T00:00:00Z`).toISOString().slice(0, 10) !==
          cleanDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Expense date must be a valid YYYY-MM-DD date.",
      });
    }

    // Make sure the category belongs to this shop and has the same type.
    // Validate the category only when one is provided.
    if (categoryId) {
      const categoryResult = await pool.query(
        `
    SELECT id
    FROM expense_categories
    WHERE id = $1
      AND shop_id = $2
      AND expense_type = $3
    `,
        [categoryId, shopId, expense_type],
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid category for this shop or expense type.",
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO expenses (
        shop_id,
        category_id,
        created_by,
        title,
        description,
        amount,
        expense_type,
        expense_date,
        payment_method,
        reference_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), $9, $10)
      RETURNING *
      `,
      [
        shopId,
        categoryId,
        userId,
        title.trim(),
        description?.trim() || null,
        Number(amount),
        expense_type,
        cleanDate,
        payment_method,
        reference_number?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL EXPENSES
export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const { page, limit, offset } = getPagination(req);

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const expenseType =
      typeof req.query.expense_type === "string" ? req.query.expense_type : "";

    const startDate =
      typeof req.query.start_date === "string" ? req.query.start_date : "";

    const endDate =
      typeof req.query.end_date === "string" ? req.query.end_date : "";

    if (expenseType && !expenseTypes.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense type.",
      });
    }

    if (
      (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const values = [
      shopId,
      search,
      `%${search}%`,
      expenseType,
      startDate || null,
      endDate || null,
    ];

    const whereClause = `
      WHERE e.shop_id = $1
        AND (
          $2 = ''
          OR e.title ILIKE $3
          OR COALESCE(e.description, '') ILIKE $3
          OR COALESCE(ec.category_name, '') ILIKE $3
        )
        AND ($4 = '' OR e.expense_type = $4)
        AND ($5::date IS NULL OR e.expense_date >= $5::date)
        AND ($6::date IS NULL OR e.expense_date <= $6::date)
    `;

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      ${whereClause}
      `,
      values,
    );

    const result = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.amount,
        e.expense_type,
        e.expense_date,
        e.payment_method,
        e.reference_number,
        e.created_at,
        ec.id AS category_id,
        ec.category_name,
        u.full_name AS created_by_name

      FROM expenses e

      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN users u ON u.id = e.created_by

      ${whereClause}

      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $7 OFFSET $8
      `,
      [...values, limit, offset],
    );

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      message: "Expenses fetched successfully.",
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE EXPENSE
export const getExpenseById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const expenseId = getExpenseId(req);

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        e.*,
        ec.category_name,
        u.full_name AS created_by_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.id = $1 AND e.shop_id = $2
      `,
      [expenseId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE EXPENSE
export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const expenseId = getExpenseId(req);

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const {
      category_id,
      title,
      description,
      amount,
      expense_type,
      expense_date,
      payment_method,
      reference_number,
    } = req.body;

    const currentResult = await pool.query(
      `SELECT * FROM expenses WHERE id = $1 AND shop_id = $2`,
      [expenseId, shopId],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    const current = currentResult.rows[0];

    if (
      category_id !== undefined &&
      category_id !== null &&
      typeof category_id !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const newCategoryId =
      category_id === undefined
        ? current.category_id
        : typeof category_id === "string" && category_id.trim()
          ? category_id.trim()
          : null;
    const newType = expense_type ?? current.expense_type;

    const newTitle = title ?? current.title;
    const newDescription =
      description === undefined ? current.description : description;

    const newAmount = amount === undefined ? current.amount : Number(amount);

    const newDate = expense_date ?? current.expense_date;
    const newMethod = payment_method ?? current.payment_method;

    const newReference =
      reference_number === undefined
        ? current.reference_number
        : reference_number;

    if (
      typeof newTitle !== "string" ||
      !newTitle.trim() ||
      !Number.isFinite(newAmount) ||
      newAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and a valid positive amount are required.",
      });
    }

    // Validate the category only when one is assigned.

    const categoryResult = await pool.query(
      `
      SELECT id
      FROM expense_categories
      WHERE id = $1
        AND shop_id = $2
        AND expense_type = $3
      `,
      [newCategoryId, shopId, newType],
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category for this shop or expense type.",
      });
    }

    if (!expenseTypes.includes(newType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense type.",
      });
    }

    if (!paymentMethods.includes(newMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    if (
      (newDescription !== null && typeof newDescription !== "string") ||
      (newReference !== null && typeof newReference !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Description and reference number must be strings.",
      });
    }

    if (
      typeof newDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(newDate) ||
      Number.isNaN(Date.parse(`${newDate}T00:00:00Z`)) ||
      new Date(`${newDate}T00:00:00Z`).toISOString().slice(0, 10) !== newDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Expense date must be a valid YYYY-MM-DD date.",
      });
    }

    const result = await pool.query(
      `
      UPDATE expenses
      SET
        category_id = $1,
        title = $2,
        description = $3,
        amount = $4,
        expense_type = $5,
        expense_date = $6,
        payment_method = $7,
        reference_number = $8,
        updated_at = NOW()
      WHERE id = $9 AND shop_id = $10
      RETURNING *
      `,
      [
        newCategoryId,
        newTitle.trim(),
        newDescription?.trim() || null,
        newAmount,
        newType,
        newDate,
        newMethod,
        newReference?.trim() || null,
        expenseId,
        shopId,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE EXPENSE
export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const expenseId = getExpenseId(req);

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID.",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM expenses
      WHERE id = $1 AND shop_id = $2
      RETURNING id, title, amount, expense_type
      `,
      [expenseId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET EXPENSE SUMMARY
// GET MONTHLY FINANCIAL SUMMARY
export const getExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;

    // Read selected month date range from query parameters.
    const startDate =
      typeof req.query.start_date === "string" ? req.query.start_date : null;

    const endDate =
      typeof req.query.end_date === "string" ? req.query.end_date : null;

    // Validate date format.
    if (
      (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const result = await pool.query(
      `
      WITH monthly_sales AS (
        SELECT
          COALESCE(SUM(s.total_amount), 0) AS total_sales,
          COUNT(*)::int AS total_sales_count
        FROM sales s
        WHERE s.shop_id = $1
          AND s.status <> 'cancelled'
          AND ($2::date IS NULL OR s.sale_date::date >= $2::date)
          AND ($3::date IS NULL OR s.sale_date::date <= $3::date)
      ),

      monthly_received AS (
        SELECT
          COALESCE(SUM(p.amount), 0) AS total_received,
          COUNT(*)::int AS total_payment_count
        FROM payments p
        JOIN sales s
          ON s.id = p.sale_id
          AND s.shop_id = p.shop_id
        WHERE p.shop_id = $1
          AND s.status <> 'cancelled'
          AND ($2::date IS NULL OR p.payment_date >= $2::date)
          AND (
            $3::date IS NULL
            OR p.payment_date < ($3::date + INTERVAL '1 day')
          )
      ),

      monthly_due AS (
        SELECT
          COALESCE(
            SUM(
              GREATEST(
                s.total_amount - COALESCE(paid.total_paid, 0),
                0
              )
            ),
            0
          ) AS outstanding_balance
        FROM sales s
        LEFT JOIN (
          SELECT
            sale_id,
            SUM(amount) AS total_paid
          FROM payments
          WHERE shop_id = $1
          GROUP BY sale_id
        ) paid ON paid.sale_id = s.id
        WHERE s.shop_id = $1
          AND s.status <> 'cancelled'
          AND ($2::date IS NULL OR s.sale_date::date >= $2::date)
          AND ($3::date IS NULL OR s.sale_date::date <= $3::date)
      ),

      monthly_expenses AS (
        SELECT
          COALESCE(
            SUM(amount) FILTER (
              WHERE expense_type = 'business'
            ),
            0
          ) AS business_expenses,

          COALESCE(
            SUM(amount) FILTER (
              WHERE expense_type = 'personal'
            ),
            0
          ) AS personal_withdrawals,

          COALESCE(SUM(amount), 0) AS total_spending,

          COUNT(*)::int AS total_expense_count,

          COUNT(*) FILTER (
            WHERE expense_type = 'business'
          )::int AS business_expense_count,

          COUNT(*) FILTER (
            WHERE expense_type = 'personal'
          )::int AS personal_expense_count

        FROM expenses
        WHERE shop_id = $1
          AND ($2::date IS NULL OR expense_date >= $2::date)
          AND ($3::date IS NULL OR expense_date <= $3::date)
      )

      SELECT
        monthly_sales.total_sales,
        monthly_sales.total_sales_count,

        monthly_received.total_received,
        monthly_received.total_payment_count,

        monthly_due.outstanding_balance,

        monthly_expenses.business_expenses,
        monthly_expenses.personal_withdrawals,
        monthly_expenses.total_spending,

        (
          monthly_received.total_received -
          monthly_expenses.total_spending
        ) AS cash_after_spending,

        monthly_expenses.total_expense_count,
        monthly_expenses.business_expense_count,
        monthly_expenses.personal_expense_count

      FROM monthly_sales
      CROSS JOIN monthly_received
      CROSS JOIN monthly_due
      CROSS JOIN monthly_expenses
      `,
      [shopId, startDate, endDate],
    );

    return res.status(200).json({
      success: true,
      message: "Monthly financial summary fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
