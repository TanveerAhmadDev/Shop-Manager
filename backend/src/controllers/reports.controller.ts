import { Request, Response } from "express";
import { pool } from "../config/db.js";

// Check that a date is a real YYYY-MM-DD date.
const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

// Get current month's first and last date.
const getCurrentMonthRange = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
};

// GET /api/v1/reports/profit
export const getProfitReport = async (req: Request, res: Response) => {
  try {
    // Get shop ID from authenticated user.
    const shopId = req.user?.shopId;

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Shop information is missing.",
      });
    }

    // Read date filters.
    let { start_date, end_date } = req.query;

    let startDate: string;
    let endDate: string;

    // If both dates are missing, use the current month.
    if (!start_date && !end_date) {
      const range = getCurrentMonthRange();

      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      // Require both dates together.
      if (typeof start_date !== "string" || typeof end_date !== "string") {
        return res.status(400).json({
          success: false,
          message: "Both start_date and end_date are required.",
        });
      }

      startDate = start_date;
      endDate = end_date;
    }

    // Validate dates.
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use the YYYY-MM-DD format.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "start_date cannot be after end_date.",
      });
    }

    const result = await pool.query(
      `
      WITH monthly_sales AS (
        SELECT
          COUNT(*)::INTEGER AS total_sales_count,

          COALESCE(
            SUM(COALESCE(s.subtotal, 0) - COALESCE(s.discount, 0)),
            0
          ) AS sales_revenue,

          COALESCE(SUM(s.tax), 0) AS tax_collected,

          COALESCE(SUM(s.total_amount), 0) AS total_billed_amount

        FROM sales s

        WHERE s.shop_id = $1
          AND s.status = 'completed'
          AND s.sale_date >= $2::DATE
          AND s.sale_date < ($3::DATE + INTERVAL '1 day')
      ),

      monthly_cogs AS (
        SELECT
          COALESCE(SUM(si.unit_cost_price), 0) AS cost_of_goods_sold,

          COUNT(si.id)::INTEGER AS items_sold

        FROM sale_items si

        INNER JOIN sales s
          ON s.id = si.sale_id
          AND s.shop_id = $1

        WHERE s.status = 'completed'
          AND s.sale_date >= $2::DATE
          AND s.sale_date < ($3::DATE + INTERVAL '1 day')
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

          COUNT(*) FILTER (
            WHERE expense_type = 'business'
          )::INTEGER AS business_expense_count,

          COUNT(*) FILTER (
            WHERE expense_type = 'personal'
          )::INTEGER AS personal_expense_count,

          COUNT(*)::INTEGER AS total_expense_count

        FROM expenses

        WHERE shop_id = $1
          AND expense_date >= $2::DATE
          AND expense_date <= $3::DATE
      ),

      profit_calculation AS (
        SELECT
          ms.total_sales_count,
          ms.sales_revenue,
          ms.tax_collected,
          ms.total_billed_amount,

          mc.items_sold,
          mc.cost_of_goods_sold,

          me.business_expenses,
          me.personal_withdrawals,
          me.business_expense_count,
          me.personal_expense_count,
          me.total_expense_count,

          (
            ms.sales_revenue - mc.cost_of_goods_sold
          ) AS gross_profit,

          (
            ms.sales_revenue
            - mc.cost_of_goods_sold
            - me.business_expenses
          ) AS net_operating_profit

        FROM monthly_sales ms
        CROSS JOIN monthly_cogs mc
        CROSS JOIN monthly_expenses me
      )

      SELECT
        total_sales_count,
        sales_revenue,
        tax_collected,
        total_billed_amount,

        items_sold,
        cost_of_goods_sold,

        gross_profit,

        business_expenses,
        personal_withdrawals,

        net_operating_profit,

        CASE
          WHEN sales_revenue = 0 THEN 0
          ELSE ROUND(
            (net_operating_profit / sales_revenue) * 100,
            2
          )
        END AS profit_margin,

        business_expense_count,
        personal_expense_count,
        total_expense_count

      FROM profit_calculation
      `,
      [shopId, startDate, endDate],
    );

    return res.status(200).json({
      success: true,
      message: "Profit report fetched successfully.",
      data: {
        start_date: startDate,
        end_date: endDate,
        ...result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get profit report error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profit report.",
    });
  }
};
