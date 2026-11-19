import { Request, Response } from "express";
import { pool } from "../config/db.js";

// GET /api/v1/purchases
export const getPurchases = async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : null;

    const fromDate = typeof req.query.from === "string" ? req.query.from : null;
    const toDate = typeof req.query.to === "string" ? req.query.to : null;

    if (
      (fromDate && isNaN(Date.parse(fromDate))) ||
      (toDate && isNaN(Date.parse(toDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date filter.",
      });
    }

    const values = [shopId, search, fromDate, toDate];

    const filter = `
      WHERE p.shop_id = $1
        AND (
          $2::text IS NULL
          OR p.purchase_number ILIKE '%' || $2 || '%'
          OR COALESCE(ss.supplier_names, old_supplier.supplier_name, '')
             ILIKE '%' || $2 || '%'
        )
        AND ($3::date IS NULL OR p.purchase_date >= $3::date)
        AND ($4::date IS NULL OR p.purchase_date < $4::date + INTERVAL '1 day')
    `;

    const supplierJoin = `
      LEFT JOIN suppliers old_supplier
        ON old_supplier.id = p.supplier_id
       AND old_supplier.shop_id = p.shop_id

      LEFT JOIN LATERAL (
        SELECT
          STRING_AGG(DISTINCT s.supplier_name, ', ' ORDER BY s.supplier_name)
            AS supplier_names,

          COALESCE(
            JSONB_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'id', s.id,
                'supplier_name', s.supplier_name,
                'phone', s.phone
              )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::jsonb
          ) AS suppliers,

          COUNT(DISTINCT s.id)::INTEGER AS supplier_count

        FROM purchase_items pi
        LEFT JOIN suppliers s
          ON s.id = pi.supplier_id
         AND s.shop_id = p.shop_id
        WHERE pi.purchase_id = p.id
      ) ss ON TRUE
    `;

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS total
      FROM purchases p
      ${supplierJoin}
      ${filter}
      `,
      values,
    );

    const purchasesResult = await pool.query(
      `
      SELECT
        p.id,
        p.purchase_number,
        p.purchase_date,
        p.subtotal,
        p.transport_cost,
        p.other_cost,
        p.total_amount,
        p.status,
        p.notes,

        COALESCE(
          ss.supplier_names,
          old_supplier.supplier_name
        ) AS supplier_name,

        ss.suppliers,
        COALESCE(ss.supplier_count, 0) AS supplier_count,

        COALESCE(item_summary.total_quantity, 0) AS total_quantity,
        COALESCE(item_summary.total_lines, 0) AS total_lines

      FROM purchases p

      ${supplierJoin}

      LEFT JOIN LATERAL (
        SELECT
          SUM(pi.quantity)::INTEGER AS total_quantity,
          COUNT(pi.id)::INTEGER AS total_lines
        FROM purchase_items pi
        WHERE pi.purchase_id = p.id
      ) item_summary ON TRUE

      ${filter}

      ORDER BY p.purchase_date DESC, p.created_at DESC
      LIMIT $5 OFFSET $6
      `,
      [...values, limit, offset],
    );

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: purchasesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchases.",
    });
  }
};

// GET /api/v1/purchases/:purchaseId
export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;
    const shopId = req.user!.shopId;

    // Fetch purchase header and all its suppliers.
    const purchaseResult = await pool.query(
      `
      SELECT
        p.*,

        COALESCE(
          ss.supplier_names,
          old_supplier.supplier_name
        ) AS supplier_name,

        ss.suppliers,
        COALESCE(ss.supplier_count, 0) AS supplier_count,

        sh.printing_enabled AS printing_enabled

      FROM purchases p

      LEFT JOIN suppliers old_supplier
        ON old_supplier.id = p.supplier_id
       AND old_supplier.shop_id = p.shop_id

      LEFT JOIN LATERAL (
        SELECT
          STRING_AGG(DISTINCT s.supplier_name, ', ' ORDER BY s.supplier_name)
            AS supplier_names,

          COALESCE(
            JSONB_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'id', s.id,
                'supplier_name', s.supplier_name,
                'phone', s.phone,
                'email', s.email,
                'address', s.address
              )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::jsonb
          ) AS suppliers,

          COUNT(DISTINCT s.id)::INTEGER AS supplier_count

        FROM purchase_items pi
        LEFT JOIN suppliers s
          ON s.id = pi.supplier_id
         AND s.shop_id = p.shop_id
        WHERE pi.purchase_id = p.id
      ) ss ON TRUE

      LEFT JOIN shops sh
        ON sh.id = p.shop_id

      WHERE p.id = $1 AND p.shop_id = $2
      `,
      [purchaseId, shopId],
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    // Fetch purchase lines with their individual suppliers.
    const itemsResult = await pool.query(
      `
      SELECT
        pi.id AS purchase_item_id,
        pi.product_id,
        pr.product_name,

        pi.supplier_id,
        s.supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,

        pi.quantity,
        pi.unit_purchase_price,
        pi.allocated_extra_cost,
        pi.landed_unit_cost

      FROM purchase_items pi

      JOIN products pr
        ON pr.id = pi.product_id
       AND pr.shop_id = $2

      LEFT JOIN suppliers s
        ON s.id = pi.supplier_id
       AND s.shop_id = $2

      WHERE pi.purchase_id = $1

      ORDER BY pi.created_at ASC
      `,
      [purchaseId, shopId],
    );

    // Fetch all inventory generated by this purchase.
    const purchaseItemIds = itemsResult.rows.map(
      (item) => item.purchase_item_id,
    );

    let inventoryRows: Array<Record<string, unknown>> = [];

    if (purchaseItemIds.length > 0) {
      const inventoryResult = await pool.query(
        `
        SELECT
          i.id,
          i.purchase_item_id,
          i.model_number,
          i.cost_price,
          i.status,
          i.created_at

        FROM inventory_items i

        WHERE i.shop_id = $1
          AND i.purchase_item_id = ANY($2::uuid[])

        ORDER BY i.model_number ASC
        `,
        [shopId, purchaseItemIds],
      );

      inventoryRows = inventoryResult.rows;
    }

    // Group inventory under its corresponding purchase line.
    const inventoryByPurchaseItem = new Map<
      string,
      Array<Record<string, unknown>>
    >();

    for (const inventory of inventoryRows) {
      const purchaseItemId = String(inventory.purchase_item_id);

      const existing = inventoryByPurchaseItem.get(purchaseItemId) || [];

      existing.push(inventory);

      inventoryByPurchaseItem.set(purchaseItemId, existing);
    }

    const items = itemsResult.rows.map((item) => ({
      ...item,
      inventory: inventoryByPurchaseItem.get(item.purchase_item_id) || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        purchase: purchaseResult.rows[0],
        items,
      },
    });
  } catch (error) {
    console.error("Get purchase details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase details.",
    });
  }
};
