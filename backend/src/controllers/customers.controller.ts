import { Request, Response } from "express";
import { pool } from "../config/db.js";

const cleanOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;

  return value.trim() || null;
};

// POST /api/v1/customers
// Create a customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const { customer_name, phone, email, address, notes } = req.body;

    if (typeof customer_name !== "string" || !customer_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    if (customer_name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot exceed 150 characters.",
      });
    }

    const optionalFields = { phone, email, address, notes };

    for (const [field, value] of Object.entries(optionalFields)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be text.`,
        });
      }
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() || null : null;

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const result = await pool.query(
      `INSERT INTO customers (
         shop_id,
         customer_name,
         phone,
         email,
         address,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         customer_name,
         phone,
         email,
         address,
         notes,
         created_at`,
      [
        shopId,
        customer_name.trim(),
        cleanOptionalText(phone),
        normalizedEmail,
        cleanOptionalText(address),
        cleanOptionalText(notes),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer.",
    });
  }
};

// GET /api/v1/customers
// List customers with search and pagination
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "10"), 10) || 10),
    );

    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : null;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM customers
       WHERE shop_id = $1
         AND (
           $2::text IS NULL
           OR customer_name ILIKE $2
           OR phone ILIKE $2
           OR email ILIKE $2
         )`,
      [shopId, searchTerm],
    );

    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         c.id,
         c.customer_name,
        c.phone AS phone,
         c.email,
         c.address,
         c.created_at,

         COALESCE(sales_summary.total_purchases, 0) AS total_purchases,
         COALESCE(sales_summary.total_spent, 0) AS total_spent,
         COALESCE(sales_summary.total_paid, 0) AS total_paid,

         (
           COALESCE(sales_summary.total_spent, 0)
           - COALESCE(sales_summary.total_paid, 0)
         ) AS outstanding_balance

       FROM customers c

       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS total_purchases,
           COALESCE(SUM(s.total_amount), 0) AS total_spent,
           COALESCE((
             SELECT SUM(pay.amount)
             FROM payments pay
             JOIN sales paid_sales
               ON paid_sales.id = pay.sale_id
              AND paid_sales.shop_id = c.shop_id
             WHERE paid_sales.customer_id = c.id
               AND paid_sales.status = 'completed'
           ), 0) AS total_paid

         FROM sales s
         WHERE s.customer_id = c.id
           AND s.shop_id = c.shop_id
           AND s.status = 'completed'
       ) sales_summary ON TRUE

       WHERE c.shop_id = $1
         AND (
           $2::text IS NULL
           OR c.customer_name ILIKE $2
           OR c.phone ILIKE $2
           OR c.email ILIKE $2
         )

       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      [shopId, searchTerm, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Customers retrieved successfully.",
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers.",
    });
  }
};

// GET /api/v1/customers/:customerId
// Get customer details and financial summary
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }
    const shopId = req.user!.shopId;

    const result = await pool.query(
      `SELECT
         c.id,
         c.customer_name,
         c.phone AS phone,
         c.email,
         c.address,
         c.notes,
         c.created_at,
         c.updated_at,

         COALESCE(summary.total_purchases, 0) AS total_purchases,
         COALESCE(summary.total_spent, 0) AS total_spent,
         COALESCE(summary.total_paid, 0) AS total_paid,

         (
           COALESCE(summary.total_spent, 0)
           - COALESCE(summary.total_paid, 0)
         ) AS outstanding_balance

       FROM customers c

       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS total_purchases,
           COALESCE(SUM(s.total_amount), 0) AS total_spent,
           COALESCE((
             SELECT SUM(pay.amount)
             FROM payments pay
             JOIN sales paid_sales
               ON paid_sales.id = pay.sale_id
              AND paid_sales.shop_id = c.shop_id
             WHERE paid_sales.customer_id = c.id
               AND paid_sales.status = 'completed'
           ), 0) AS total_paid

         FROM sales s
         WHERE s.customer_id = c.id
           AND s.shop_id = c.shop_id
           AND s.status = 'completed'
       ) summary ON TRUE

       WHERE c.id = $1
         AND c.shop_id = $2`,
      [customerId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer retrieved successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer.",
    });
  }
};

// PATCH /api/v1/customers/:customerId
// Update customer information
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }
    const shopId = req.user!.shopId;

    const allowedFields = [
      "customer_name",
      "phone",
      "email",
      "address",
      "notes",
    ] as const;

    const updates: { column: string; value: string | null }[] = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field];

        if (value !== null && typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be text or null.`,
          });
        }

        updates.push({
          column: field,
          value: typeof value === "string" ? value.trim() || null : null,
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const nameUpdate = updates.find((item) => item.column === "customer_name");

    if (nameUpdate && (!nameUpdate.value || nameUpdate.value.length > 150)) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required and cannot exceed 150 characters.",
      });
    }

    const emailUpdate = updates.find((item) => item.column === "email");

    if (emailUpdate?.value) {
      emailUpdate.value = emailUpdate.value.toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailUpdate.value)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
        });
      }
    }

    // Column names come only from the fixed allowlist above.
    const setClauses = updates.map(
      (item, index) => `${item.column} = $${index + 1}`,
    );

    const values = updates.map((item) => item.value);

    setClauses.push("updated_at = NOW()");

    values.push(customerId, shopId);

    const result = await pool.query(
      `UPDATE customers
       SET ${setClauses.join(", ")}
       WHERE id = $${values.length - 1}
         AND shop_id = $${values.length}
       RETURNING
         id,
         customer_name,
         phone,
         email,
         address,
         notes,
         updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer.",
    });
  }
};

// GET /api/v1/customers/:customerId/purchases
// Get customer's sales history and remaining balances
export const getCustomerPurchases = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }
    const shopId = req.user!.shopId;

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "10"), 10) || 10),
    );

    const offset = (page - 1) * limit;

    const customerResult = await pool.query(
      `SELECT id, customer_name
       FROM customers
       WHERE id = $1 AND shop_id = $2`,
      [customerId, shopId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM sales
       WHERE customer_id = $1
         AND shop_id = $2`,
      [customerId, shopId],
    );

    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         s.id AS sale_id,
         s.sale_number,
         s.sale_date,
         s.subtotal,
         s.discount,
         s.tax,
         s.total_amount,
         s.status,

         COALESCE(payment_summary.total_paid, 0) AS total_paid,

   CASE
  WHEN s.status = 'completed'
  THEN s.total_amount - COALESCE(payment_summary.total_paid, 0)
  ELSE 0
END AS outstanding_balance

       FROM sales s

       LEFT JOIN LATERAL (
         SELECT SUM(p.amount) AS total_paid
         FROM payments p
         WHERE p.sale_id = s.id
           AND p.shop_id = s.shop_id
       ) payment_summary ON TRUE

       WHERE s.customer_id = $1
         AND s.shop_id = $2

       ORDER BY s.sale_date DESC, s.created_at DESC
       LIMIT $3 OFFSET $4`,
      [customerId, shopId, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Customer purchase history retrieved successfully.",
      data: {
        customer: customerResult.rows[0],
        purchases: result.rows,
      },
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customer purchases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer purchase history.",
    });
  }
};
