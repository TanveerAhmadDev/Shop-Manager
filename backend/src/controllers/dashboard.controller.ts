import { Request, Response } from "express";
import { pool } from "../config/db.js";

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const shopId = req.user?.shopId;

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const result = await pool.query(
      `
      SELECT

        -- Shop information
        (
          SELECT shop_name
          FROM shops
          WHERE id = $1
        ) AS shop_name,

        -- Today's net sales after completed returns
        (
          SELECT
            COALESCE(SUM(s.total_amount), 0)
            -
            COALESCE((
              SELECT SUM(sr.return_total)
              FROM sale_returns sr
              WHERE sr.shop_id = $1
                AND sr.status = 'completed'
                AND sr.updated_at::date = CURRENT_DATE
            ), 0)
          FROM sales s
          WHERE s.shop_id = $1
            AND s.sale_date::date = CURRENT_DATE
            AND s.status = 'completed'
        ) AS today_sales,

        -- Today's business expenses and personal withdrawals
        (
          SELECT COALESCE(SUM(e.amount), 0)
          FROM expenses e
          WHERE e.shop_id = $1
            AND e.expense_date::date = CURRENT_DATE
        ) AS today_expenses,

        -- Available inventory
        (
          SELECT COUNT(*)
          FROM inventory_items
          WHERE shop_id = $1
            AND status = 'in_stock'
        ) AS available_stock,

        -- Outstanding customer balances
        (
          SELECT COALESCE(
            SUM(
              GREATEST(
                s.total_amount
                - COALESCE(p.total_paid, 0)
                - COALESCE(r.exchange_credit, 0)
                - COALESCE(r.balance_adjusted, 0),
                0
              )
            ),
            0
          )
          FROM sales s

          LEFT JOIN (
            SELECT
              sale_id,
              SUM(amount) AS total_paid
            FROM payments
            WHERE shop_id = $1
            GROUP BY sale_id
          ) p ON p.sale_id = s.id

          LEFT JOIN (
            SELECT
              sale_id,
              SUM(exchange_credit) AS exchange_credit,
              SUM(balance_adjusted) AS balance_adjusted
            FROM (
              SELECT
                sale_id,
                0::numeric AS exchange_credit,
                SUM(balance_adjusted_amount) AS balance_adjusted
              FROM sale_returns
              WHERE shop_id = $1
                AND status = 'completed'
              GROUP BY sale_id

              UNION ALL

              SELECT
                replacement_sale_id AS sale_id,
                SUM(exchange_credit_amount) AS exchange_credit,
                0::numeric AS balance_adjusted
              FROM sale_returns
              WHERE shop_id = $1
                AND status = 'completed'
                AND replacement_sale_id IS NOT NULL
              GROUP BY replacement_sale_id
            ) return_settlements
            GROUP BY sale_id
          ) r ON r.sale_id = s.id

          WHERE s.shop_id = $1
            AND s.status = 'completed'
        ) AS customer_credit,

        -- Today's actual profit from completed sales
        (
          SELECT COALESCE(
            SUM(
              s.subtotal
              - s.discount
              - costs.total_cost
            ),
            0
          )
          FROM sales s

          LEFT JOIN LATERAL (
            SELECT COALESCE(
              SUM(si.unit_cost_price * si.quantity),
              0
            ) AS total_cost
            FROM sale_items si
            WHERE si.sale_id = s.id
          ) costs ON TRUE

          WHERE s.shop_id = $1
            AND s.sale_date::date = CURRENT_DATE
            AND s.status = 'completed'
        )

        -- Adjust profit for returns completed today
        + (
          SELECT COALESCE(
            SUM(
              - (sri.unit_sale_price - sri.allocated_discount)
              + CASE
                  WHEN sri.condition = 'good'
                  THEN sri.unit_cost_price
                  ELSE 0
                END
            ),
            0
          )
          FROM sale_returns sr
          JOIN sale_return_items sri
            ON sri.sale_return_id = sr.id
          WHERE sr.shop_id = $1
            AND sr.status = 'completed'
            AND sri.status = 'completed'
            AND sr.updated_at::date = CURRENT_DATE
        ) AS today_profit
      `,
      [shopId],
    );

    const summary = result.rows[0];

    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully.",
      data: {
        shop_name: summary.shop_name,
        today_sales: Number(summary.today_sales),
        today_expenses: Number(summary.today_expenses),
        available_stock: Number(summary.available_stock),
        customer_credit: Number(summary.customer_credit),
        today_profit: Number(summary.today_profit),
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary.",
    });
  }
};
