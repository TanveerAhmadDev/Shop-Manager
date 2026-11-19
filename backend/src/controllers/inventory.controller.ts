import { Request, Response } from "express";
import { pool } from "../config/db.js";

// Allowed inventory statuses
type InventoryStatus =
  | "in_stock"
  | "sold"
  | "damaged"
  | "returned"
  | "cancelled";

// GET /api/v1/inventory
// List inventory with search, filters and pagination
export const getInventory = async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    // Read query parameters
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status = typeof req.query.status === "string" ? req.query.status : "";

    const categoryId =
      typeof req.query.category_id === "string" ? req.query.category_id : "";

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "10"), 10) || 10),
    );

    const offset = (page - 1) * limit;

    // Validate status filter
    const allowedStatuses: InventoryStatus[] = [
      "in_stock",
      "sold",
      "damaged",
      "returned",
      "cancelled",
    ];

    if (status && !allowedStatuses.includes(status as InventoryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory status.",
      });
    }

    // Validate category ID
    if (
      categoryId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        categoryId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const searchTerm = search ? `%${search}%` : null;
    const statusFilter = status || null;
    const categoryFilter = categoryId || null;

    // Get total matching inventory count
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM inventory_items i
       JOIN products pr
         ON pr.id = i.product_id
       WHERE i.shop_id = $1
         AND pr.shop_id = $1
         AND (
           $2::text IS NULL
           OR i.model_number ILIKE $2
           OR pr.product_name ILIKE $2
         )
         AND (
           $3::text IS NULL
           OR i.status = $3
         )
         AND (
           $4::uuid IS NULL
           OR pr.category_id = $4
         )`,
      [shopId, searchTerm, statusFilter, categoryFilter],
    );

    const total = countResult.rows[0].total;

    // Get inventory records
    const inventoryResult = await pool.query(
      `SELECT
         i.id,
         i.model_number,
         i.cost_price,
         i.status,
         i.created_at,

         pr.id AS product_id,
         pr.product_name,
         pr.brand,
         pr.material,
         pr.color,

         c.id AS category_id,
         c.name AS category_name

       FROM inventory_items i

       JOIN products pr
         ON pr.id = i.product_id
        AND pr.shop_id = i.shop_id

       LEFT JOIN categories c
         ON c.id = pr.category_id
        AND c.shop_id = i.shop_id

       WHERE i.shop_id = $1
         AND (
           $2::text IS NULL
           OR i.model_number ILIKE $2
           OR pr.product_name ILIKE $2
         )
         AND (
           $3::text IS NULL
           OR i.status = $3
         )
         AND (
           $4::uuid IS NULL
           OR pr.category_id = $4
         )

       ORDER BY i.created_at DESC, i.model_number ASC
       LIMIT $5 OFFSET $6`,
      [shopId, searchTerm, statusFilter, categoryFilter, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Inventory retrieved successfully.",
      data: inventoryResult.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory.",
    });
  }
};

// GET /api/v1/inventory/:inventoryId
// Get one furniture item with its purchase information
export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { inventoryId } = req.params;
    const shopId = req.user!.shopId;

    const result = await pool.query(
      `SELECT
         i.id,
         i.model_number,
         i.cost_price,
         i.status,
         i.created_at,
         i.updated_at,

         pr.id AS product_id,
         pr.product_name,
         pr.description AS product_description,
         pr.brand,
         pr.material,
         pr.color,

         c.id AS category_id,
         c.name AS category_name,

        p.id AS purchase_id,
p.purchase_number,
p.purchase_date,
p.status AS purchase_status,

pi.quantity AS purchase_quantity,
pi.unit_purchase_price,
pi.allocated_extra_cost,

         s.id AS supplier_id,
         s.supplier_name

       FROM inventory_items i

       JOIN products pr
         ON pr.id = i.product_id
        AND pr.shop_id = i.shop_id

       LEFT JOIN categories c
         ON c.id = pr.category_id
        AND c.shop_id = i.shop_id

       LEFT JOIN purchase_items pi
         ON pi.id = i.purchase_item_id

       LEFT JOIN purchases p
         ON p.id = pi.purchase_id
        AND p.shop_id = i.shop_id

       LEFT JOIN suppliers s
         ON s.id = p.supplier_id
        AND s.shop_id = i.shop_id

       WHERE i.id = $1
         AND i.shop_id = $2`,
      [inventoryId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory item retrieved successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get inventory item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory item.",
    });
  }
};

// PATCH /api/v1/inventory/:inventoryId/status
// Change inventory status and save adjustment history
export const updateInventoryStatus = async (req: Request, res: Response) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { inventoryId } = req.params;
    const shopId = req.user!.shopId;
    const userId = req.user!.userId;

    const { new_status, reason, notes } = req.body;

    // Only these manual transitions are allowed for now
    if (!["in_stock", "damaged"].includes(new_status)) {
      return res.status(400).json({
        success: false,
        message:
          "You can only mark an item as damaged or restore it to in_stock.",
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A reason is required for the inventory adjustment.",
      });
    }

    if (reason.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: "Reason cannot exceed 255 characters.",
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be text.",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the inventory record to prevent simultaneous changes
    const inventoryResult = await client.query(
      `SELECT id, model_number, status
       FROM inventory_items
       WHERE id = $1 AND shop_id = $2
       FOR UPDATE`,
      [inventoryId, shopId],
    );

    if (inventoryResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    const item = inventoryResult.rows[0];
    const previousStatus = item.status as InventoryStatus;

    // Check the permitted status transitions
    const validTransition =
      (previousStatus === "in_stock" && new_status === "damaged") ||
      (previousStatus === "damaged" && new_status === "in_stock");

    if (!validTransition) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: `Cannot change inventory status from ${previousStatus} to ${new_status}.`,
      });
    }

    // Update inventory status
    await client.query(
      `UPDATE inventory_items
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2 AND shop_id = $3`,
      [new_status, inventoryId, shopId],
    );

    // Record the adjustment history
    const adjustmentResult = await client.query(
      `INSERT INTO inventory_adjustments (
         shop_id,
         inventory_item_id,
         previous_status,
         new_status,
         reason,
         notes,
         adjusted_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        shopId,
        inventoryId,
        previousStatus,
        new_status,
        reason.trim(),
        typeof notes === "string" ? notes.trim() || null : null,
        userId,
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Inventory status updated successfully.",
      data: {
        inventory_id: inventoryId,
        model_number: item.model_number,
        previous_status: previousStatus,
        new_status,
        adjustment_id: adjustmentResult.rows[0].id,
        adjusted_at: adjustmentResult.rows[0].created_at,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Update inventory status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update inventory status.",
    });
  } finally {
    client.release();
  }
};

// GET /api/v1/inventory/adjustments
// Get all inventory adjustment history for the shop
export const getInventoryAdjustments = async (req: Request, res: Response) => {
  try {
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

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM inventory_adjustments
       WHERE shop_id = $1`,
      [shopId],
    );

    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         ia.id AS adjustment_id,
         ia.previous_status,
         ia.new_status,
         ia.reason,
         ia.notes,
         ia.created_at,

         i.id AS inventory_id,
         i.model_number,

         pr.id AS product_id,
         pr.product_name,

         u.id AS adjusted_by_id,
         u.full_name AS adjusted_by_name

       FROM inventory_adjustments ia

       JOIN inventory_items i
         ON i.id = ia.inventory_item_id
        AND i.shop_id = ia.shop_id

       JOIN products pr
         ON pr.id = i.product_id
        AND pr.shop_id = ia.shop_id

       LEFT JOIN users u
         ON u.id = ia.adjusted_by
        AND u.shop_id = ia.shop_id

       WHERE ia.shop_id = $1

       ORDER BY ia.created_at DESC, ia.id DESC
       LIMIT $2 OFFSET $3`,
      [shopId, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Inventory adjustment history retrieved successfully.",
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get inventory adjustments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory adjustment history.",
    });
  }
};

// GET /api/v1/inventory/:inventoryId/adjustments
// Get adjustment history for one inventory item
export const getInventoryItemAdjustments = async (
  req: Request,
  res: Response,
) => {
  try {
    const { inventoryId } = req.params;
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

    // Confirm that this inventory item belongs to the logged-in shop
    const inventoryResult = await pool.query(
      `SELECT id, model_number
       FROM inventory_items
       WHERE id = $1 AND shop_id = $2`,
      [inventoryId, shopId],
    );

    if (inventoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM inventory_adjustments
       WHERE shop_id = $1
         AND inventory_item_id = $2`,
      [shopId, inventoryId],
    );

    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         ia.id AS adjustment_id,
         ia.previous_status,
         ia.new_status,
         ia.reason,
         ia.notes,
         ia.created_at,

         u.id AS adjusted_by_id,
         u.full_name AS adjusted_by_name

       FROM inventory_adjustments ia

       LEFT JOIN users u
         ON u.id = ia.adjusted_by
        AND u.shop_id = ia.shop_id

       WHERE ia.shop_id = $1
         AND ia.inventory_item_id = $2

       ORDER BY ia.created_at DESC, ia.id DESC
       LIMIT $3 OFFSET $4`,
      [shopId, inventoryId, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Furniture adjustment history retrieved successfully.",
      data: {
        inventory: inventoryResult.rows[0],
        adjustments: result.rows,
      },
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get inventory item adjustments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve furniture adjustment history.",
    });
  }
};

// Get one inventory item using its model number
export const getInventoryByModelNumber = async (
  req: Request,
  res: Response,
) => {
  try {
    const shopId = req.user?.shopId;
    const modelNumber = String(req.params.modelNumber).trim().toUpperCase();

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await pool.query(
      `SELECT
        i.id,
        i.model_number,
           i.product_id,
        i.cost_price,
        i.status,
        p.product_name,
        p.brand,
        p.material,
        p.color
      FROM inventory_items i
      LEFT JOIN products p
        ON p.id = i.product_id
        AND p.shop_id = i.shop_id
      WHERE i.shop_id = $1
        AND UPPER(i.model_number) = $2
      LIMIT 1`,
      [shopId, modelNumber],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid model number. Furniture not found.",
      });
    }

    const item = result.rows[0];

    let message = "Furniture found.";

    switch (item.status) {
      case "sold":
        message = "This furniture has already been sold.";
        break;

      case "damaged":
        message = "This furniture is marked as damaged.";
        break;

      case "cancelled":
        message = "This furniture is cancelled.";
        break;

      case "returned":
        message = "This furniture has been returned.";
        break;

      case "in_stock":
        message = "Furniture is available.";
        break;
    }

    return res.status(200).json({
      success: true,
      message,
      data: item,
    });
  } catch (error) {
    console.error("Get inventory by model number error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to find furniture.",
    });
  }
};
