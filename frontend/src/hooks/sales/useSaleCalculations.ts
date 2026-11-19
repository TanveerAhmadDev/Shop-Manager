import { useMemo } from "react";
import type { BillItem } from "@/components/sales/new-sale/types";

interface UseSaleCalculationsProps {
  items: BillItem[];
  discount: string;
  tax: string;
  paymentAmount: string;
}

export function useSaleCalculations({
  items,
  discount,
  tax,
  paymentAmount,
}: UseSaleCalculationsProps) {
  // Calculate total selling price.
  // Each bill item can contain multiple physical pieces.
  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        return sum + Number(item.price || 0) * item.quantity;
      }, 0),
    [items],
  );

  const discountValue = Math.max(0, Number(discount) || 0);
  const taxValue = Math.max(0, Number(tax) || 0);

  // Calculate final bill amount.
  const total = Math.max(0, subtotal - discountValue + taxValue);

  const paid = Math.max(0, Number(paymentAmount) || 0);
  const balance = Math.max(0, total - paid);

  const isPaymentInvalid = paid > total;

  // Estimated cost based on the scanned inventory item's cost.
  // Actual cost is calculated separately for every selected piece
  // by the backend when the sale is created.
  const totalLandedCost = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.inventory.cost_price || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const grossExpectedProfit = subtotal - totalLandedCost;
  const expectedProfit = grossExpectedProfit - discountValue;

  return {
    subtotal,
    discountValue,
    taxValue,
    total,
    paid,
    balance,
    isPaymentInvalid,
    totalLandedCost,
    grossExpectedProfit,
    expectedProfit,
  };
}
