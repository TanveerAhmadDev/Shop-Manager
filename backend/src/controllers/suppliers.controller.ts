import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db.js";

// Helper: safely read a route parameter.
// Express types may allow string | string[].
const getSupplierId = (req: Request): string | null => {
  const supplierId = req.params.supplierId;

  return typeof supplierId === "string" ? supplierId : null;
};

// Helper: read optional text fields.
const cleanOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned || null;
};

// Helper: pagination values.
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

// CREATE SUPPLIER
export const createSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;

    const { supplier_name, phone, email, address, notes } = req.body;

    if (typeof supplier_name !== "string" || !supplier_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    // Validate optional fields.
    for (const [field, value] of Object.entries({
      phone,
      email,
      address,
      notes,
    })) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`,
        });
      }
    }

    const cleanEmail = cleanOptionalText(email)?.toLowerCase() ?? null;

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO suppliers (
        shop_id,
        supplier_name,
        phone,
        email,
        address,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        supplier_name,
        phone,
        email,
        address,
        notes,
        created_at,
        updated_at
      `,
      [
        shopId,
        supplier_name.trim(),
        cleanOptionalText(phone),
        cleanEmail,
        cleanOptionalText(address),
        cleanOptionalText(notes),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL SUPPLIERS
export const getSuppliers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;

    const { page, limit, offset } = getPagination(req);

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const searchValue = `%${search}%`;

    // Count matching suppliers.
    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM suppliers s
      WHERE s.shop_id = $1
        AND (
          $2 = ''
          OR s.supplier_name ILIKE $3
          OR COALESCE(s.phone, '') ILIKE $3
          OR COALESCE(s.email, '') ILIKE $3
        )
      `,
      [shopId, search, searchValue],
    );

    // Get suppliers and their purchase summaries.
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.supplier_name,
        s.phone,
        s.email,
        s.address,
        s.notes,
        s.created_at,
        s.updated_at,

        COALESCE(ps.purchase_count, 0)::int AS purchase_count,
        COALESCE(ps.total_purchase_amount, 0) AS total_purchase_amount,
        ps.last_purchase_date

      FROM suppliers s

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS purchase_count,
          COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount,
          MAX(p.purchase_date) AS last_purchase_date
        FROM purchases p
        WHERE p.supplier_id = s.id
          AND p.shop_id = s.shop_id
          AND p.status = 'received'
      ) ps ON TRUE

      WHERE s.shop_id = $1
        AND (
          $2 = ''
          OR s.supplier_name ILIKE $3
          OR COALESCE(s.phone, '') ILIKE $3
          OR COALESCE(s.email, '') ILIKE $3
        )

      ORDER BY s.created_at DESC
      LIMIT $4 OFFSET $5
      `,
      [shopId, search, searchValue, limit, offset],
    );

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      message: "Suppliers fetched successfully.",
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

// GET SINGLE SUPPLIER WITH PURCHASE HISTORY
export const getSupplierById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const supplierId = getSupplierId(req);

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.supplier_name,
        s.phone,
        s.email,
        s.address,
        s.notes,
        s.created_at,
        s.updated_at,

        COALESCE(ps.purchase_count, 0)::int AS purchase_count,
        COALESCE(ps.total_purchase_amount, 0) AS total_purchase_amount,
        ps.last_purchase_date,

        COALESCE(ph.purchase_history, '[]'::jsonb) AS purchase_history

      FROM suppliers s

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS purchase_count,
          COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount,
          MAX(p.purchase_date) AS last_purchase_date
        FROM purchases p
        WHERE p.supplier_id = s.id
          AND p.shop_id = s.shop_id
          AND p.status = 'received'
      ) ps ON TRUE

      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', recent.id,
            'purchase_number', recent.purchase_number,
            'purchase_date', recent.purchase_date,
            'total_amount', recent.total_amount,
            'status', recent.status
          )
          ORDER BY recent.purchase_date DESC
        ) AS purchase_history
        FROM (
          SELECT
            p.id,
            p.purchase_number,
            p.purchase_date,
            p.total_amount,
            p.status
          FROM purchases p
          WHERE p.supplier_id = s.id
            AND p.shop_id = s.shop_id
          ORDER BY p.purchase_date DESC
          LIMIT 10
        ) recent
      ) ph ON TRUE

      WHERE s.id = $1
        AND s.shop_id = $2
      `,
      [supplierId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SUPPLIER
export const updateSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const supplierId = getSupplierId(req);

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const { supplier_name, phone, email, address, notes } = req.body;

    const updates: { column: string; value: string | null }[] = [];

    // Only update fields actually provided by the client.
    if (supplier_name !== undefined) {
      if (typeof supplier_name !== "string" || !supplier_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Supplier name cannot be empty.",
        });
      }

      updates.push({
        column: "supplier_name",
        value: supplier_name.trim(),
      });
    }

    const optionalFields = [
      { key: "phone", value: phone },
      { key: "email", value: email },
      { key: "address", value: address },
      { key: "notes", value: notes },
    ];

    for (const field of optionalFields) {
      if (field.value !== undefined) {
        if (field.value !== null && typeof field.value !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field.key} must be a string.`,
          });
        }

        let value = cleanOptionalText(field.value);

        if (field.key === "email" && value) {
          value = value.toLowerCase();

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid email address.",
            });
          }
        }

        updates.push({
          column: field.key,
          value,
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    // Column names come only from the fixed allowlist above.
    const setClause = updates
      .map((field, index) => `${field.column} = $${index + 1}`)
      .join(", ");

    const values: (string | null)[] = updates.map((field) => field.value);

    values.push(supplierId);
    values.push(shopId);

    const supplierIdPosition = values.length - 1;
    const shopIdPosition = values.length;

    const result = await pool.query(
      `
      UPDATE suppliers
      SET ${setClause},
          updated_at = NOW()
      WHERE id = $${supplierIdPosition}
        AND shop_id = $${shopIdPosition}
      RETURNING
        id,
        supplier_name,
        phone,
        email,
        address,
        notes,
        created_at,
        updated_at
      `,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE SUPPLIER
export const deleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = req.user!.shopId;
    const supplierId = getSupplierId(req);

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    // Delete only when this supplier has no purchase records.
    const result = await pool.query(
      `
      DELETE FROM suppliers s
      WHERE s.id = $1
        AND s.shop_id = $2
        AND NOT EXISTS (
          SELECT 1
          FROM purchases p
          WHERE p.supplier_id = s.id
            AND p.shop_id = s.shop_id
        )
      RETURNING s.id, s.supplier_name
      `,
      [supplierId, shopId],
    );

    if (result.rows.length === 0) {
      // Determine whether the supplier is missing or has purchase history.
      const supplierResult = await pool.query(
        `
        SELECT
          s.id,
          EXISTS (
            SELECT 1
            FROM purchases p
            WHERE p.supplier_id = s.id
              AND p.shop_id = s.shop_id
          ) AS has_purchases
        FROM suppliers s
        WHERE s.id = $1
          AND s.shop_id = $2
        `,
        [supplierId, shopId],
      );

      if (supplierResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "This supplier cannot be deleted because purchase records exist.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
