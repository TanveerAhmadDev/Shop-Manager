import { PoolClient } from "pg";
import { toPaisa } from "./toPaisa.js";
import { fromPaisa } from "./fromPaisa.js";

// Calculate how much of a return should settle outstanding balance
// and how much should actually be refunded.
export async function calculateReturnSettlement(
  client: PoolClient,
  saleId: string,
  shopId: string,
  saleTotal: number | string,
  returnTotal: number | string,
) {
  const result = await client.query(
    `
    SELECT
      COALESCE(
        (SELECT SUM(amount)
         FROM payments
         WHERE sale_id = $1 AND shop_id = $2), 0
      ) AS paid_amount,

      COALESCE(
        (SELECT SUM(exchange_credit_amount)
         FROM sale_returns
         WHERE replacement_sale_id = $1
           AND shop_id = $2
           AND status = 'completed'), 0
      ) AS exchange_credit_amount,

      COALESCE(
        (SELECT SUM(balance_adjusted_amount)
         FROM sale_returns
         WHERE sale_id = $1
           AND shop_id = $2
           AND status = 'completed'), 0
      ) AS balance_adjusted_amount,

      COALESCE(
        (SELECT SUM(srr.amount)
         FROM sale_return_refunds srr
         JOIN sale_returns sr
           ON sr.id = srr.sale_return_id
           AND sr.shop_id = srr.shop_id
         WHERE sr.sale_id = $1
           AND sr.shop_id = $2
           AND sr.status = 'completed'), 0
      ) AS previously_refunded
    `,
    [saleId, shopId],
  );

  const settlement = result.rows[0];

  const totalPaisa = toPaisa(saleTotal);
  const paidPaisa = toPaisa(settlement.paid_amount);
  const exchangeCreditPaisa = toPaisa(settlement.exchange_credit_amount);
  const previousAdjustedPaisa = toPaisa(settlement.balance_adjusted_amount);
  const previousRefundedPaisa = toPaisa(settlement.previously_refunded);

  const outstandingPaisa = Math.max(
    0,
    totalPaisa - paidPaisa - exchangeCreditPaisa - previousAdjustedPaisa,
  );

  const returnTotalPaisa = toPaisa(returnTotal);

  const balanceAdjustedPaisa = Math.min(returnTotalPaisa, outstandingPaisa);

  const availablePaidPaisa = Math.max(0, paidPaisa - previousRefundedPaisa);

  const refundEntitlementPaisa = returnTotalPaisa - balanceAdjustedPaisa;

  const refundPaisa = Math.min(refundEntitlementPaisa, availablePaidPaisa);

  return {
    totalPaisa,
    paidPaisa,
    exchangeCreditPaisa,
    previousAdjustedPaisa,
    previousRefundedPaisa,
    outstandingPaisa,
    returnTotalPaisa,
    balanceAdjustedPaisa,
    refundEntitlementPaisa,
    refundPaisa,
    canComplete: refundPaisa === refundEntitlementPaisa,

    settlement: {
      original_sale_total: fromPaisa(totalPaisa),
      previously_paid: fromPaisa(paidPaisa),
      previous_balance_adjusted: fromPaisa(previousAdjustedPaisa),
      previous_refunded: fromPaisa(previousRefundedPaisa),
      outstanding_before_return: fromPaisa(outstandingPaisa),
      return_total: fromPaisa(returnTotalPaisa),
      balance_adjusted: fromPaisa(balanceAdjustedPaisa),
      refund_amount: fromPaisa(refundPaisa),
    },
  };
}
