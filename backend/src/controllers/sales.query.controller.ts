import { Request, Response } from "express";
import { pool } from "../config/db.js";

// GET /api/v1/sales
export const getSales = async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    // Pagination
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Optional filters
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : null;

    const fromDate = typeof req.query.from === "string" ? req.query.from : null;

    const toDate = typeof req.query.to === "string" ? req.query.to : null;

    // Validate dates before sending them to PostgreSQL
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
      WHERE s.shop_id = $1
        AND (
          $2::text IS NULL
          OR s.sale_number ILIKE '%' || $2 || '%'
          OR COALESCE(c.customer_name, '') ILIKE '%' || $2 || '%'
          OR COALESCE(c.phone, '') ILIKE '%' || $2 || '%'
        )
        AND ($3::date IS NULL OR s.sale_date >= $3::date)
        AND ($4::date IS NULL OR s.sale_date < $4::date + INTERVAL '1 day')
    `;

    // Get total matching sales for pagination
    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ${filter}
      `,
      values,
    );

    // Get sales and their payment summaries

    const salesResult = await pool.query(
      `
  SELECT
    s.id,
    s.sale_number,
    s.sale_date,
    s.subtotal,
    s.total_amount,
    s.discount,
    s.tax,
    s.status,
    c.customer_name,
    c.phone,

    -- Actual money received
    settlement.paid_amount,

    -- Credit received from returned furniture
    settlement.exchange_credit_amount,

    -- Original outstanding balance cancelled through returns
    settlement.balance_adjusted_amount,

    -- Return summary
return_summary.returned_amount,
return_summary.returned_item_count,
return_summary.total_item_count,

CASE
  WHEN return_summary.returned_item_count = 0 THEN 'none'
  WHEN return_summary.returned_item_count >= return_summary.total_item_count
    THEN 'fully_returned'
  ELSE 'partially_returned'
END AS return_status,

    -- Total amount settled
    (
      settlement.paid_amount
      + settlement.exchange_credit_amount
      + settlement.balance_adjusted_amount
    ) AS settled_amount,

    -- Remaining customer balance
    (
      s.total_amount
      - settlement.paid_amount
      - settlement.exchange_credit_amount
      - settlement.balance_adjusted_amount
    ) AS remaining_balance,

    -- Return-adjusted profit information
    profit.actual_total_cost,
    profit.returned_sale_amount,
    profit.returned_discount,
    profit.returned_good_cost,

    -- Actual gross profit after returns
    (
      s.subtotal
      - profit.returned_sale_amount
      - profit.actual_total_cost
    ) AS actual_gross_profit,

    -- Actual profit after discount adjustments
    CASE
      WHEN s.status = 'completed' THEN
        (
          s.subtotal
          - profit.returned_sale_amount
          - profit.actual_total_cost
          - s.discount
          + profit.returned_discount
        )
      ELSE 0
    END AS actual_profit

  FROM sales s

  LEFT JOIN customers c
    ON c.id = s.customer_id

  LEFT JOIN LATERAL (
    SELECT
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.sale_id = s.id
          AND p.shop_id = s.shop_id
      ), 0) AS paid_amount,

      COALESCE((
        SELECT SUM(sr.exchange_credit_amount)
        FROM sale_returns sr
        WHERE sr.replacement_sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
      ), 0) AS exchange_credit_amount,

      COALESCE((
        SELECT SUM(sr.balance_adjusted_amount)
        FROM sale_returns sr
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
      ), 0) AS balance_adjusted_amount
   ) settlement ON TRUE

  -- Return summary
  LEFT JOIN LATERAL (
    SELECT
      -- Total value of completed returned items
      COALESCE((
        SELECT SUM(sri.return_amount)
        FROM sale_returns sr
        JOIN sale_return_items sri
          ON sri.sale_return_id = sr.id
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
          AND sri.status = 'completed'
      ), 0) AS returned_amount,

      -- Number of physical items returned
      COALESCE((
        SELECT COUNT(DISTINCT sri.inventory_item_id)
        FROM sale_returns sr
        JOIN sale_return_items sri
          ON sri.sale_return_id = sr.id
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
          AND sri.status = 'completed'
      ), 0)::int AS returned_item_count,

      -- Original number of physical items sold
      COALESCE((
        SELECT SUM(si.quantity)
        FROM sale_items si
        WHERE si.sale_id = s.id
      ), 0)::int AS total_item_count

  ) return_summary ON TRUE

    LEFT JOIN LATERAL (
    SELECT
      -- Original cost of all sold furniture
      COALESCE((
        SELECT SUM(si.unit_cost_price * si.quantity)
        FROM sale_items si
        WHERE si.sale_id = s.id
      ), 0) AS original_total_cost,

      -- Selling value of returned furniture
      COALESCE((
        SELECT SUM(sri.unit_sale_price)
        FROM sale_returns sr
        JOIN sale_return_items sri
          ON sri.sale_return_id = sr.id
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
          AND sri.status = 'completed'
      ), 0) AS returned_sale_amount,

      -- Discount allocated to returned items
      COALESCE((
        SELECT SUM(sri.allocated_discount)
        FROM sale_returns sr
        JOIN sale_return_items sri
          ON sri.sale_return_id = sr.id
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
          AND sri.status = 'completed'
      ), 0) AS returned_discount,

      -- Cost of returned furniture that passed inspection
      COALESCE((
        SELECT SUM(
          CASE
            WHEN sri.condition = 'good'
            THEN sri.unit_cost_price
            ELSE 0
          END
        )
        FROM sale_returns sr
        JOIN sale_return_items sri
          ON sri.sale_return_id = sr.id
        WHERE sr.sale_id = s.id
          AND sr.shop_id = s.shop_id
          AND sr.status = 'completed'
          AND sri.status = 'completed'
      ), 0) AS returned_good_cost,

      -- Actual remaining cost after good returns
      GREATEST(
        0,
        COALESCE((
          SELECT SUM(si.unit_cost_price * si.quantity)
          FROM sale_items si
          WHERE si.sale_id = s.id
        ), 0)
        -
        COALESCE((
          SELECT SUM(
            CASE
              WHEN sri.condition = 'good'
              THEN sri.unit_cost_price
              ELSE 0
            END
          )
          FROM sale_returns sr
          JOIN sale_return_items sri
            ON sri.sale_return_id = sr.id
          WHERE sr.sale_id = s.id
            AND sr.shop_id = s.shop_id
            AND sr.status = 'completed'
            AND sri.status = 'completed'
        ), 0)
      ) AS actual_total_cost

  ) profit ON TRUE

  ${filter}

  ORDER BY s.sale_date DESC, s.created_at DESC
  LIMIT $5 OFFSET $6
  `,
      [...values, limit, offset],
    );

    return res.status(200).json({
      success: true,
      data: salesResult.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales.",
    });
  }
};

// GET /api/v1/sales/:saleId
export const getSaleById = async (req: Request, res: Response) => {
  try {
    const { saleId } = req.params;
    const shopId = req.user!.shopId;

    // Get bill information, customer details, and shop details
    const saleResult = await pool.query(
      `
      SELECT
        s.*,

        -- Shop information
        sh.shop_name AS shop_name,
        sh.phone AS shop_phone,
        sh.address AS shop_address,
        sh.printing_enabled AS printing_enabled,

        -- Customer information
        c.customer_name,
        c.phone AS phone,
        c.email AS customer_email,
        c.address AS customer_address,

        -- Payment information
       -- Payment and settlement information
COALESCE(settlement.paid_amount, 0) AS paid_amount,

COALESCE(settlement.exchange_credit_amount, 0)
  AS exchange_credit_amount,

COALESCE(settlement.balance_adjusted_amount, 0)
  AS balance_adjusted_amount,

(
  COALESCE(settlement.paid_amount, 0)
  + COALESCE(settlement.exchange_credit_amount, 0)
  + COALESCE(settlement.balance_adjusted_amount, 0)
) AS settled_amount,

(
  s.total_amount
  - COALESCE(settlement.paid_amount, 0)
  - COALESCE(settlement.exchange_credit_amount, 0)
  - COALESCE(settlement.balance_adjusted_amount, 0)
) AS remaining_balance

      FROM sales s

      LEFT JOIN shops sh
        ON sh.id = s.shop_id

      LEFT JOIN customers c
        ON c.id = s.customer_id

   LEFT JOIN LATERAL (
  SELECT
    COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.sale_id = s.id
        AND p.shop_id = s.shop_id
    ), 0) AS paid_amount,

    COALESCE((
      SELECT SUM(sr.exchange_credit_amount)
      FROM sale_returns sr
      WHERE sr.replacement_sale_id = s.id
        AND sr.shop_id = s.shop_id
        AND sr.status = 'completed'
    ), 0) AS exchange_credit_amount,

    COALESCE((
      SELECT SUM(sr.balance_adjusted_amount)
      FROM sale_returns sr
      WHERE sr.sale_id = s.id
        AND sr.shop_id = s.shop_id
        AND sr.status = 'completed'
    ), 0) AS balance_adjusted_amount
) settlement ON TRUE

      WHERE s.id = $1 AND s.shop_id = $2
      `,
      [saleId, shopId],
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    // Get items belonging to this bill
    // Get items belonging to this bill
    const itemsResult = await pool.query(
      `
  SELECT
    si.id,

    -- Identify item type
    CASE
      WHEN si.inventory_item_id IS NULL THEN 'bulk'
      ELSE 'individual'
    END AS type,

    si.inventory_item_id,
    si.model_number,

    -- Product information
    si.product_name,

    -- Quantity and prices
    si.quantity,
    si.unit_sale_price,
    si.unit_cost_price

  FROM sale_items si

  LEFT JOIN products p
    ON p.id = si.product_id

  WHERE si.sale_id = $1
  ORDER BY si.created_at
  `,
      [saleId],
    );

    // Calculate actual cost using the cost of every sold inventory item.

    // Original cost of all items sold.
    const originalTotalCost = itemsResult.rows.reduce(
      (sum, item) =>
        sum + Number(item.unit_cost_price || 0) * Number(item.quantity || 1),
      0,
    );

    // Get financial adjustments from completed returns.
    const returnsResult = await pool.query(
      `
  SELECT
    COALESCE(SUM(sri.unit_sale_price), 0) AS returned_sale_amount,

    COALESCE(SUM(sri.allocated_discount), 0)
      AS returned_discount,

    COALESCE(
      SUM(
        CASE
          WHEN sri.condition = 'good'
          THEN sri.unit_cost_price
          ELSE 0
        END
      ), 0
    ) AS returned_good_cost

  FROM sale_returns sr

  JOIN sale_return_items sri
    ON sri.sale_return_id = sr.id

  WHERE sr.sale_id = $1
    AND sr.shop_id = $2
    AND sr.status = 'completed'
    AND sri.status = 'completed'
  `,
      [saleId, shopId],
    );

    const returnSummary = returnsResult.rows[0];

    const returnedSaleAmount = Number(returnSummary.returned_sale_amount);

    const returnedDiscount = Number(returnSummary.returned_discount);

    const returnedGoodCost = Number(returnSummary.returned_good_cost);

    // Cost remaining in cost of goods sold.
    // Good returned furniture is back in inventory.
    const actualTotalCost = Math.max(0, originalTotalCost - returnedGoodCost);

    // Get sale information.
    const sale = saleResult.rows[0];

    const actualSubtotal = Number(sale.subtotal || 0);
    const discount = Number(sale.discount || 0);

    // Calculate actual profit.
    // Tax is excluded from profit.
    // Revenue is reduced by completed returned items.
    // Returned discount is reversed.
    // Tax is excluded from profit.
    const actualGrossProfit =
      actualSubtotal - returnedSaleAmount - actualTotalCost;

    const actualProfit =
      sale.status === "completed"
        ? actualGrossProfit - discount + returnedDiscount
        : 0;

    // Get payment history
    const paymentsResult = await pool.query(
      `
      SELECT
        id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes
      FROM payments
      WHERE sale_id = $1 AND shop_id = $2
      ORDER BY payment_date DESC
      `,
      [saleId, shopId],
    );

    return res.status(200).json({
      success: true,
      data: {
        sale: {
          ...sale,
          returned_sale_amount: Number(returnedSaleAmount.toFixed(2)),
          returned_discount: Number(returnedDiscount.toFixed(2)),
          returned_good_cost: Number(returnedGoodCost.toFixed(2)),
          actual_total_cost: Number(actualTotalCost.toFixed(2)),
          actual_gross_profit: Number(actualGrossProfit.toFixed(2)),
          actual_profit: Number(actualProfit.toFixed(2)),
        },
        items: itemsResult.rows,
        payments: paymentsResult.rows,
      },
    });
  } catch (error) {
    console.error("Get sale details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale details.",
    });
  }
};
