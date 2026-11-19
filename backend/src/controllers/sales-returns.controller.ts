import type { Request, Response } from "express";
import { pool } from "../config/db.js";
import type { PaymentMethod } from "../types/sales.types.js";
import { toPaisa } from "../utils/toPaisa.js";
import { fromPaisa } from "../utils/fromPaisa.js";
import { calculateReturnSettlement } from "../utils/saleReturnSettlement.js";

interface ReturnItemInput {
  sale_item_id: string;
}

interface CreateSaleReturnBody {
  return_type: "refund" | "exchange";
  reason?: string;
  items: ReturnItemInput[];
}

export interface CompleteSaleReturnBody {
  refund_amount: number;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

// Convert a database amount into integer paisa.

// Convert integer paisa back into a decimal amount.

interface InspectReturnItemInput {
  return_item_id: string;
  condition: "good" | "damaged" | "needs_repair";
}

interface InspectSaleReturnBody {
  items: InspectReturnItemInput[];
}

// Distribute an amount proportionally without losing rounding cents.
function allocateAmount(
  totalPaisa: number,
  items: { id: string; weight: number }[],
): Map<string, number> {
  const allocations = new Map<string, number>();

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0 || totalPaisa <= 0) {
    items.forEach((item) => allocations.set(item.id, 0));
    return allocations;
  }

  const totalWeightBig = BigInt(totalWeight);
  const totalPaisaBig = BigInt(totalPaisa);

  const results = items.map((item) => {
    const numerator = totalPaisaBig * BigInt(item.weight);

    const amount = numerator / totalWeightBig;
    const remainder = numerator % totalWeightBig;

    return {
      id: item.id,
      amount: Number(amount),
      remainder,
    };
  });

  let allocated = results.reduce((sum, item) => sum + item.amount, 0);

  results.sort((a, b) => {
    if (a.remainder > b.remainder) return -1;
    if (a.remainder < b.remainder) return 1;
    return a.id.localeCompare(b.id);
  });

  for (let i = 0; allocated < totalPaisa; i++) {
    results[i].amount += 1;
    allocated += 1;
  }

  results.forEach((item) => {
    allocations.set(item.id, item.amount);
  });

  return allocations;
}

export const createSaleReturn = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const shopId = req.user?.shopId;
    const saleId = req.params.saleId;

    const body = req.body as CreateSaleReturnBody;

    const { return_type, reason, items } = body;

    if (!shopId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!["refund", "exchange"].includes(return_type)) {
      res.status(400).json({
        success: false,
        message: "Return type must be refund or exchange.",
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please select at least one item to return.",
      });
      return;
    }

    const saleItemIds = items.map((item) => item.sale_item_id);

    if (
      saleItemIds.some(
        (id) =>
          typeof id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid sale item ID.",
      });
      return;
    }

    if (new Set(saleItemIds).size !== saleItemIds.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate items are not allowed.",
      });
      return;
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the shop row so return numbers remain sequential.
    const shopResult = await client.query(
      `SELECT id
       FROM shops
       WHERE id = $1 AND is_active = TRUE
       FOR UPDATE`,
      [shopId],
    );

    if (shopResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(403).json({
        success: false,
        message: "Shop is inactive or unavailable.",
      });
      return;
    }

    // Lock and validate the original sale.
    const saleResult = await client.query(
      `SELECT
         id,
         shop_id,
         subtotal,
         discount,
         tax,
         total_amount,
         status
       FROM sales
       WHERE id = $1 AND shop_id = $2
       FOR UPDATE`,
      [saleId, shopId],
    );

    if (
      saleResult.rows.length === 0 ||
      saleResult.rows[0].status !== "completed"
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(404).json({
        success: false,
        message: "Completed sale not found.",
      });
      return;
    }

    const sale = saleResult.rows[0];

    // Get all original sale items.
    const saleItemsResult = await client.query(
      `SELECT
         id,
         inventory_item_id,
         model_number,
         product_name,
         unit_sale_price,
         unit_cost_price,
         quantity
       FROM sale_items
       WHERE sale_id = $1
       ORDER BY id
       FOR UPDATE`,
      [saleId],
    );

    const saleItems = saleItemsResult.rows;

    // Find the requested items in the original sale.
    const selectedItems = saleItemIds.map((id) =>
      saleItems.find((item) => item.id === id),
    );

    if (selectedItems.some((item) => !item)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "One or more items do not belong to this sale.",
      });
      return;
    }

    // Only individual inventory items can be returned.
    const invalidItems = selectedItems.some(
      (item) =>
        !item!.inventory_item_id ||
        !item!.model_number ||
        Number(item!.quantity) !== 1,
    );

    if (invalidItems) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only individually tracked items can be returned.",
      });
      return;
    }

    const inventoryIds = selectedItems.map((item) => item!.inventory_item_id);

    // Lock inventory and make sure every item belongs to this shop.
    const inventoryResult = await client.query(
      `SELECT id, status
       FROM inventory_items
       WHERE id = ANY($1::uuid[])
         AND shop_id = $2
       FOR UPDATE`,
      [inventoryIds, shopId],
    );

    if (inventoryResult.rows.length !== inventoryIds.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "One or more inventory items are invalid.",
      });
      return;
    }

    const unavailableItem = inventoryResult.rows.some(
      (item) => item.status !== "sold",
    );

    if (unavailableItem) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only sold inventory items can be returned.",
      });
      return;
    }

    // Calculate the original sale's discount allocation.
    const allocationItems = saleItems.map((item) => ({
      id: item.id,
      weight: toPaisa(item.unit_sale_price) * Number(item.quantity),
    }));

    const discountAllocations = allocateAmount(
      toPaisa(sale.discount),
      allocationItems,
    );

    // Allocate tax proportionally after discount.
    const netAllocationItems = allocationItems.map((item) => ({
      id: item.id,
      weight: Math.max(
        0,
        item.weight - (discountAllocations.get(item.id) || 0),
      ),
    }));

    const taxAllocations = allocateAmount(
      toPaisa(sale.tax),
      netAllocationItems,
    );

    // Calculate the value of only the selected returned items.
    let returnTotalPaisa = 0;

    const returnItems = selectedItems.map((item) => {
      const lineAmount = toPaisa(item!.unit_sale_price);
      const allocatedDiscount = discountAllocations.get(item!.id) || 0;
      const allocatedTax = taxAllocations.get(item!.id) || 0;

      const returnAmount = lineAmount - allocatedDiscount + allocatedTax;

      returnTotalPaisa += returnAmount;

      return {
        sale_item_id: item!.id,
        inventory_item_id: item!.inventory_item_id,
        model_number: item!.model_number,
        product_name: item!.product_name,
        unit_sale_price: fromPaisa(lineAmount),
        unit_cost_price: fromPaisa(toPaisa(item!.unit_cost_price)),
        allocated_discount: fromPaisa(allocatedDiscount),
        allocated_tax: fromPaisa(allocatedTax),
        return_amount: fromPaisa(returnAmount),
      };
    });

    // Generate the next return number for this shop.
    const numberResult = await client.query(
      `SELECT COALESCE(
         MAX(SUBSTRING(return_number FROM 5)::BIGINT),
         0
       ) + 1 AS next_number
       FROM sale_returns
       WHERE shop_id = $1
         AND return_number ~ '^RET-[0-9]+$'`,
      [shopId],
    );

    const nextNumber = Number(numberResult.rows[0].next_number);
    const returnNumber = `RET-${String(nextNumber).padStart(4, "0")}`;

    // Create the pending return request.
    const returnResult = await client.query(
      `INSERT INTO sale_returns (
         shop_id,
         sale_id,
         return_number,
         return_type,
         reason,
         return_total,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        shopId,
        saleId,
        returnNumber,
        return_type,
        reason?.trim() || null,
        fromPaisa(returnTotalPaisa),
      ],
    );

    const saleReturn = returnResult.rows[0];

    // Save each returned physical item.
    for (const item of returnItems) {
      await client.query(
        `INSERT INTO sale_return_items (
           sale_return_id,
           sale_item_id,
           inventory_item_id,
           model_number,
           product_name,
           unit_sale_price,
           unit_cost_price,
           allocated_discount,
           allocated_tax,
           return_amount,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        [
          saleReturn.id,
          item.sale_item_id,
          item.inventory_item_id,
          item.model_number,
          item.product_name,
          item.unit_sale_price,
          item.unit_cost_price,
          item.allocated_discount,
          item.allocated_tax,
          item.return_amount,
        ],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      success: true,
      message: "Return request created successfully.",
      data: {
        ...saleReturn,
        items: returnItems,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    // The unique index prevents an item from having
    // multiple pending or completed return requests.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        success: false,
        message: "One or more items already have an active return request.",
      });
      return;
    }

    console.error("Create sale return error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create return request.",
    });
  } finally {
    client.release();
  }
};

export const getSaleReturns = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const shopId = req.user?.shopId;

    if (!shopId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    // Read query parameters.
    const getString = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    const search = getString(req.query.search);
    const status = getString(req.query.status).toLowerCase();
    const returnType = getString(req.query.return_type).toLowerCase();
    const dateFrom = getString(req.query.date_from);
    const dateTo = getString(req.query.date_to);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Validate pagination.
    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      !Number.isSafeInteger(offset)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
      return;
    }

    // Validate status.
    const allowedStatuses = ["pending", "completed", "cancelled"];

    if (status && !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid return status.",
      });
      return;
    }

    // Validate return type.
    const allowedTypes = ["refund", "exchange"];

    if (returnType && !allowedTypes.includes(returnType)) {
      res.status(400).json({
        success: false,
        message: "Invalid return type.",
      });
      return;
    }

    // Validate YYYY-MM-DD dates.
    const isValidDate = (value: string): boolean => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      (dateFrom && !isValidDate(dateFrom)) ||
      (dateTo && !isValidDate(dateTo))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD format.",
      });
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
      return;
    }

    const conditions: string[] = ["sr.shop_id = $1"];
    const values: unknown[] = [shopId];

    // Search across return, sale, customer, and returned items.
    if (search) {
      values.push(`%${search}%`);
      const searchIndex = values.length;

      conditions.push(`
        (
          sr.return_number ILIKE $${searchIndex}
          OR s.sale_number ILIKE $${searchIndex}
          OR COALESCE(c.customer_name, '') ILIKE $${searchIndex}
          OR COALESCE(c.phone, '') ILIKE $${searchIndex}
          OR EXISTS (
            SELECT 1
            FROM sale_return_items sri_search
            WHERE sri_search.sale_return_id = sr.id
              AND (
                sri_search.product_name ILIKE $${searchIndex}
                OR sri_search.model_number ILIKE $${searchIndex}
              )
          )
        )
      `);
    }

    if (status) {
      values.push(status);
      conditions.push(`sr.status = $${values.length}`);
    }

    if (returnType) {
      values.push(returnType);
      conditions.push(`sr.return_type = $${values.length}`);
    }

    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(`sr.return_date >= $${values.length}::date`);
    }

    if (dateTo) {
      values.push(dateTo);
      conditions.push(
        `sr.return_date < ($${values.length}::date + INTERVAL '1 day')`,
      );
    }

    const whereClause = conditions.join(" AND ");

    // Get total matching records.
    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM sale_returns sr
       LEFT JOIN sales s
         ON s.id = sr.sale_id
         AND s.shop_id = sr.shop_id
       LEFT JOIN customers c
         ON c.id = s.customer_id
         AND c.shop_id = sr.shop_id
       WHERE ${whereClause}`,
      values,
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Get the current page of returns.
    const dataValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT
         sr.*,
         s.sale_number,
         c.customer_name,
         c.phone AS customer_phone,
         COUNT(sri.id)::INTEGER AS item_count,
         COALESCE(
           ARRAY_AGG(DISTINCT sri.model_number)
             FILTER (WHERE sri.model_number IS NOT NULL),
           ARRAY[]::VARCHAR[]
         ) AS model_numbers
       FROM sale_returns sr
       LEFT JOIN sales s
         ON s.id = sr.sale_id
         AND s.shop_id = sr.shop_id
       LEFT JOIN customers c
         ON c.id = s.customer_id
         AND c.shop_id = sr.shop_id
       LEFT JOIN sale_return_items sri
         ON sri.sale_return_id = sr.id
       WHERE ${whereClause}
       GROUP BY
         sr.id,
         s.sale_number,
         c.customer_name,
         c.phone
       ORDER BY sr.return_date DESC, sr.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      dataValues,
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get sale returns error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve sale returns.",
    });
  }
};

export const getSaleReturnById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();

  try {
    const shopId = req.user?.shopId;
    const returnId = req.params.returnId;

    if (!shopId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    // Get return request with original sale and customer details.
    const returnResult = await client.query(
      `SELECT
         sr.*,

         s.sale_number,
         s.sale_date,
         s.subtotal AS sale_subtotal,
         s.discount AS sale_discount,
         s.tax AS sale_tax,
         s.total_amount AS sale_total,
         s.status AS sale_status,

         c.id AS customer_id,
         c.customer_name,
         c.phone AS customer_phone,
         c.email AS customer_email,
         c.address AS customer_address,

         replacement.sale_number AS replacement_sale_number

       FROM sale_returns sr

       JOIN sales s
         ON s.id = sr.sale_id
         AND s.shop_id = sr.shop_id

       LEFT JOIN customers c
         ON c.id = s.customer_id
         AND c.shop_id = sr.shop_id

       LEFT JOIN sales replacement
         ON replacement.id = sr.replacement_sale_id
         AND replacement.shop_id = sr.shop_id

       WHERE sr.id = $1
         AND sr.shop_id = $2`,
      [returnId, shopId],
    );

    if (returnResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
      return;
    }

    const saleReturn = returnResult.rows[0];

    // Calculate the expected refund for pending refund requests.
    let refundPreview: string | number = Number(saleReturn.refund_amount || 0);

    let balanceAdjustmentPreview: string | number = Number(
      saleReturn.balance_adjusted_amount || 0,
    );
    let refundPreviewCanComplete = true;

    if (
      saleReturn.status === "pending" &&
      saleReturn.return_type === "refund"
    ) {
      const returnSettlement = await calculateReturnSettlement(
        client,
        saleReturn.sale_id,
        shopId,
        saleReturn.sale_total,
        saleReturn.return_total,
      );

      refundPreview = fromPaisa(returnSettlement.refundPaisa);

      balanceAdjustmentPreview = fromPaisa(
        returnSettlement.balanceAdjustedPaisa,
      );

      refundPreviewCanComplete = returnSettlement.canComplete;
    }

    // Get all returned physical items.
    const itemsResult = await client.query(
      `SELECT
         sri.id,
         sri.sale_item_id,
         sri.inventory_item_id,
         sri.model_number,
         sri.product_name,
         sri.unit_sale_price,
         sri.unit_cost_price,
         sri.allocated_discount,
         sri.allocated_tax,
         sri.return_amount,
         sri.condition,
         sri.status,
         sri.created_at,
         sri.inspected_at,

         ii.status AS inventory_status,
         ii.product_id,

         si.quantity AS original_sale_quantity

       FROM sale_return_items sri

       JOIN sale_returns sr
         ON sr.id = sri.sale_return_id
         AND sr.shop_id = $2

       LEFT JOIN inventory_items ii
         ON ii.id = sri.inventory_item_id
         AND ii.shop_id = sr.shop_id

       LEFT JOIN sale_items si
         ON si.id = sri.sale_item_id
         AND si.sale_id = sr.sale_id

       WHERE sri.sale_return_id = $1

       ORDER BY sri.created_at ASC, sri.id ASC`,
      [returnId, shopId],
    );

    // Get actual refunds recorded for this return.
    const refundsResult = await client.query(
      `SELECT
         id,
         amount,
         payment_method,
         reference_number,
         refund_date,
         notes,
         created_at
       FROM sale_return_refunds
       WHERE sale_return_id = $1
         AND shop_id = $2
       ORDER BY refund_date ASC, created_at ASC`,
      [returnId, shopId],
    );

    const refunds = refundsResult.rows;

    const totalRefunded = refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        ...saleReturn,

        refund_preview: refundPreview,
        balance_adjustment_preview: balanceAdjustmentPreview,
        refund_preview_can_complete: refundPreviewCanComplete,

        customer: saleReturn.customer_id
          ? {
              id: saleReturn.customer_id,
              name: saleReturn.customer_name,
              phone: saleReturn.customer_phone,
              email: saleReturn.customer_email,
              address: saleReturn.customer_address,
            }
          : null,

        original_sale: {
          id: saleReturn.sale_id,
          sale_number: saleReturn.sale_number,
          sale_date: saleReturn.sale_date,
          subtotal: saleReturn.sale_subtotal,
          discount: saleReturn.sale_discount,
          tax: saleReturn.sale_tax,
          total_amount: saleReturn.sale_total,
          status: saleReturn.sale_status,
        },

        replacement_sale: saleReturn.replacement_sale_id
          ? {
              id: saleReturn.replacement_sale_id,
              sale_number: saleReturn.replacement_sale_number,
            }
          : null,

        items: itemsResult.rows,

        refunds: {
          records: refunds,
          total_refunded: totalRefunded.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Get sale return details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve return request details.",
    });
  } finally {
    client.release();
  }
};

export const inspectSaleReturn = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const shopId = req.user?.shopId;
    const returnId = req.params.returnId;

    const body = req.body as InspectSaleReturnBody;
    const { items } = body;

    if (!shopId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one item to inspect.",
      });
      return;
    }

    const allowedConditions = ["good", "damaged", "needs_repair"];

    // Validate IDs and conditions before starting the transaction.
    for (const item of items) {
      if (
        !item.return_item_id ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.return_item_id,
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid return item ID.",
        });
        return;
      }

      if (!allowedConditions.includes(item.condition)) {
        res.status(400).json({
          success: false,
          message: "Invalid item condition.",
        });
        return;
      }
    }

    const returnItemIds = items.map((item) => item.return_item_id);

    if (new Set(returnItemIds).size !== returnItemIds.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate return items are not allowed.",
      });
      return;
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the return request and verify shop ownership.
    const returnResult = await client.query(
      `SELECT id, status
       FROM sale_returns
       WHERE id = $1
         AND shop_id = $2
       FOR UPDATE`,
      [returnId, shopId],
    );

    if (returnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
      return;
    }

    if (returnResult.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only pending return requests can be inspected.",
      });
      return;
    }

    // Lock the requested return items.
    const itemResult = await client.query(
      `SELECT id, status
       FROM sale_return_items
       WHERE sale_return_id = $1
         AND id = ANY($2::uuid[])
       FOR UPDATE`,
      [returnId, returnItemIds],
    );

    if (itemResult.rows.length !== returnItemIds.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "One or more items do not belong to this return request.",
      });
      return;
    }

    const unavailableItem = itemResult.rows.some(
      (item) => item.status !== "pending",
    );

    if (unavailableItem) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only pending return items can be inspected.",
      });
      return;
    }

    // Save inspection results.
    for (const item of items) {
      await client.query(
        `UPDATE sale_return_items
SET
  condition = $1,
  inspected_at = NOW()
WHERE id = $2
  AND sale_return_id = $3
  AND status = 'pending'`,
        [item.condition, item.return_item_id, returnId],
      );
    }

    // Retrieve updated inspection results.
    const updatedItems = await client.query(
      `SELECT
  id,
  sale_item_id,
  inventory_item_id,
  model_number,
  product_name,
  condition,
  inspected_at,
  status,
  return_amount
FROM sale_return_items
WHERE sale_return_id = $1
ORDER BY created_at ASC, id ASC`,
      [returnId],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(200).json({
      success: true,
      message: "Return items inspected successfully.",
      data: {
        return_id: returnId,
        return_status: "pending",
        items: updatedItems.rows,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Inspect sale return error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to inspect return items.",
    });
  } finally {
    client.release();
  }
};

const refundPaymentMethods: PaymentMethod[] = [
  "cash",
  "bank",
  "easypaisa",
  "jazzcash",
  "other",
];

export const completeSaleReturn = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const shopId = req.user?.shopId;
    const returnId = req.params.returnId;

    const body = req.body as CompleteSaleReturnBody;

    if (!shopId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the return request.
    const returnResult = await client.query(
      `SELECT
         id,
         sale_id,
         return_type,
         return_total,
         status
       FROM sale_returns
       WHERE id = $1
         AND shop_id = $2
       FOR UPDATE`,
      [returnId, shopId],
    );

    if (returnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(404).json({
        success: false,
        message: "Return request not found.",
      });
      return;
    }

    const saleReturn = returnResult.rows[0];

    if (saleReturn.status !== "pending") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only pending returns can be completed.",
      });
      return;
    }

    // Exchange completion will be implemented separately.
    if (saleReturn.return_type !== "refund") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Only refund returns can be completed through this endpoint.",
      });
      return;
    }

    // Lock the original sale.
    const saleResult = await client.query(
      `SELECT id, total_amount, status
       FROM sales
       WHERE id = $1
         AND shop_id = $2
       FOR UPDATE`,
      [saleReturn.sale_id, shopId],
    );

    if (
      saleResult.rows.length === 0 ||
      saleResult.rows[0].status !== "completed"
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Original sale is not available for settlement.",
      });
      return;
    }

    const sale = saleResult.rows[0];

    // Lock all return items and their inventory records.
    const itemsResult = await client.query(
      `SELECT
         sri.id,
         sri.inventory_item_id,
         sri.condition,
         sri.inspected_at,
         sri.status,
         ii.status AS inventory_status
       FROM sale_return_items sri
       JOIN inventory_items ii
         ON ii.id = sri.inventory_item_id
         AND ii.shop_id = $2
       WHERE sri.sale_return_id = $1
       ORDER BY sri.id
       FOR UPDATE OF sri, ii`,
      [returnId, shopId],
    );

    const items = itemsResult.rows;

    if (items.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "This return has no items.",
      });
      return;
    }

    // Every item must be inspected before completion.
    const notInspected = items.some((item) => !item.inspected_at);

    if (notInspected) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Please inspect every returned item before completion.",
      });
      return;
    }

    const invalidItems = items.some(
      (item) =>
        item.status !== "pending" ||
        item.inventory_status !== "sold" ||
        !["good", "damaged", "needs_repair"].includes(item.condition),
    );

    if (invalidItems) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "One or more returned items are no longer available.",
      });
      return;
    }

    // Calculate the original sale's settlement using our helper.
    const returnSettlement = await calculateReturnSettlement(
      client,
      sale.id,
      shopId,
      sale.total_amount,
      saleReturn.return_total,
    );

    const balanceAdjustedPaisa = returnSettlement.balanceAdjustedPaisa;
    const maximumRefundPaisa = returnSettlement.refundPaisa;

    // Validate the amount entered by the owner.
    const enteredRefundAmount = Number(body.refund_amount);

    if (
      body.refund_amount === undefined ||
      !Number.isFinite(enteredRefundAmount) ||
      enteredRefundAmount < 0
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Please enter a valid refund amount.",
      });
      return;
    }

    const refundPaisa = toPaisa(enteredRefundAmount);

    // The owner cannot refund more than the available amount.
    if (refundPaisa > maximumRefundPaisa) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Refund amount exceeds the maximum refundable amount.",
        data: {
          maximum_refund: fromPaisa(maximumRefundPaisa),
        },
      });
      return;
    }

    // Return the actual amount selected by the owner in the response.
    const settlement = {
      ...returnSettlement.settlement,
      maximum_refund_amount: fromPaisa(maximumRefundPaisa),
      refund_amount: fromPaisa(refundPaisa),
    };

    const paymentMethod = body.payment_method || "cash";

    if (refundPaisa > 0 && !refundPaymentMethods.includes(paymentMethod)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(400).json({
        success: false,
        message: "Invalid refund payment method.",
      });
      return;
    }

    // Record an actual refund only when money is owed.
    let refundRecord = null;

    if (refundPaisa > 0) {
      const refundResult = await client.query(
        `INSERT INTO sale_return_refunds (
           shop_id,
           sale_return_id,
           amount,
           payment_method,
           reference_number,
           refund_date,
           notes
         )
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING *`,
        [
          shopId,
          returnId,
          fromPaisa(refundPaisa),
          paymentMethod,
          body.reference_number?.trim() || null,
          body.notes?.trim() || null,
        ],
      );

      refundRecord = refundResult.rows[0];
    }

    // Update the returned physical inventory.
    for (const item of items) {
      let inventoryStatus: string;

      if (item.condition === "good") {
        inventoryStatus = "in_stock";
      } else if (item.condition === "damaged") {
        inventoryStatus = "damaged";
      } else {
        inventoryStatus = "returned";
      }

      const inventoryUpdate = await client.query(
        `UPDATE inventory_items
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND shop_id = $3
           AND status = 'sold'`,
        [inventoryStatus, item.inventory_item_id, shopId],
      );

      if (inventoryUpdate.rowCount !== 1) {
        throw new Error(
          `Failed to update inventory item ${item.inventory_item_id}`,
        );
      }

      await client.query(
        `UPDATE sale_return_items
         SET status = 'completed'
         WHERE id = $1
           AND sale_return_id = $2
           AND status = 'pending'`,
        [item.id, returnId],
      );
    }

    // Complete the return and save its financial settlement.
    const completedResult = await client.query(
      `UPDATE sale_returns
       SET
         balance_adjusted_amount = $1,
         refund_amount = $2,
         status = 'completed',
         updated_at = NOW()
       WHERE id = $3
         AND shop_id = $4
         AND status = 'pending'
       RETURNING *`,
      [
        fromPaisa(balanceAdjustedPaisa),
        fromPaisa(refundPaisa),
        returnId,
        shopId,
      ],
    );

    if (completedResult.rows.length !== 1) {
      throw new Error("Failed to complete return request.");
    }

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(200).json({
      success: true,
      message: "Refund return completed successfully.",
      data: {
        sale_return: completedResult.rows[0],
        settlement,
        refund: refundRecord,
        inventory_updated: items.length,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Complete sale return error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to complete sale return.",
    });
  } finally {
    client.release();
  }
};
