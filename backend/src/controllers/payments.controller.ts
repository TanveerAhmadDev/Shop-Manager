import { Request, Response } from "express";
import { pool } from "../config/db.js";
import type { PaymentMethod } from "../types/sales.types.js";

const allowedMethods: PaymentMethod[] = [
  "cash",
  "bank",
  "easypaisa",
  "jazzcash",
  "other",
];

// POST /api/v1/sales/:saleId/payments
export const addSalePayment = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { saleId } = req.params;
    const shopId = req.user!.shopId;

    const { amount, payment_method, reference_number, notes } = req.body;

    // Validate amount
    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    // Convert to paisa to avoid floating-point comparison errors
    const paymentPaisa = Math.round(paymentAmount * 100);

    await client.query("BEGIN");

    // Lock the bill so simultaneous payments cannot exceed its balance
    const saleResult = await client.query(
      `
      SELECT id, total_amount, status
      FROM sales
      WHERE id = $1 AND shop_id = $2
      FOR UPDATE
      `,
      [saleId, shopId],
    );

    if (saleResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    const sale = saleResult.rows[0];

    if (sale.status !== "completed") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Payments cannot be added to a cancelled sale.",
      });
    }

    // Calculate existing payments

    // Calculate all amounts already settled against this sale.
    const settlementResult = await client.query(
      `
  SELECT
    COALESCE(
      (
        SELECT SUM(amount)
        FROM payments
        WHERE sale_id = $1 AND shop_id = $2
      ), 0
    ) AS paid_amount,

    COALESCE(
      (
        SELECT SUM(exchange_credit_amount)
        FROM sale_returns
        WHERE replacement_sale_id = $1
          AND shop_id = $2
          AND status = 'completed'
      ), 0
    ) AS exchange_credit_amount,

    COALESCE(
      (
        SELECT SUM(balance_adjusted_amount)
        FROM sale_returns
        WHERE sale_id = $1
          AND shop_id = $2
          AND status = 'completed'
      ), 0
    ) AS balance_adjusted_amount
  `,
      [saleId, shopId],
    );

    const settlement = settlementResult.rows[0];

    const totalPaisa = Math.round(Number(sale.total_amount) * 100);

    const paidPaisa = Math.round(Number(settlement.paid_amount) * 100);

    const exchangeCreditPaisa = Math.round(
      Number(settlement.exchange_credit_amount) * 100,
    );

    const adjustedBalancePaisa = Math.round(
      Number(settlement.balance_adjusted_amount) * 100,
    );

    // All three amounts reduce the outstanding balance.
    const settledPaisa = paidPaisa + exchangeCreditPaisa + adjustedBalancePaisa;

    const remainingPaisa = totalPaisa - settledPaisa;
    if (remainingPaisa <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "This sale has no remaining balance.",
        remaining_balance: (remainingPaisa / 100).toFixed(2),
      });
    }

    if (paymentPaisa > remainingPaisa) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Payment exceeds the remaining balance.",
        remaining_balance: (remainingPaisa / 100).toFixed(2),
      });
    }

    // Record the new payment
    const paymentResult = await client.query(
      `
      INSERT INTO payments (
        shop_id,
        sale_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      RETURNING *
      `,
      [
        shopId,
        saleId,
        (paymentPaisa / 100).toFixed(2),
        payment_method,
        reference_number || null,
        notes || null,
      ],
    );

    const newPaidPaisa = paidPaisa + paymentPaisa;

    const newRemainingPaisa =
      totalPaisa - newPaidPaisa - exchangeCreditPaisa - adjustedBalancePaisa;

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: {
        payment: paymentResult.rows[0],
        total_amount: (totalPaisa / 100).toFixed(2),
        paid_amount: (newPaidPaisa / 100).toFixed(2),
        remaining_balance: (newRemainingPaisa / 100).toFixed(2),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Add sale payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record payment.",
    });
  } finally {
    client.release();
  }
};
