import { Request, Response } from "express";
import { pool } from "../config/db.js";

// PATCH /api/v1/purchases/:purchaseId/cancel
export const cancelPurchase = async (req: Request, res: Response) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { purchaseId } = req.params;
    const shopId = req.user!.shopId;

    await client.query("BEGIN");
    transactionStarted = true;

    // 1. Lock the purchase
    const purchaseResult = await client.query(
      `
      SELECT id, purchase_number, status
      FROM purchases
      WHERE id = $1 AND shop_id = $2
      FOR UPDATE
      `,
      [purchaseId, shopId],
    );

    if (purchaseResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    const purchase = purchaseResult.rows[0];

    if (purchase.status !== "received") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "This purchase is already cancelled.",
      });
    }

    // 2. Get the expected quantity from purchase lines
    const quantityResult = await client.query(
      `
      SELECT COALESCE(SUM(quantity), 0)::int AS expected_quantity
      FROM purchase_items
      WHERE purchase_id = $1
      `,
      [purchaseId],
    );

    const expectedQuantity = Number(quantityResult.rows[0].expected_quantity);

    if (expectedQuantity === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "This purchase has no inventory items to cancel.",
      });
    }

    // 3. Lock all inventory records belonging to this purchase
    const inventoryResult = await client.query(
      `
      SELECT
        i.id,
        i.model_number,
        i.status
      FROM inventory_items i
      JOIN purchase_items pi
        ON pi.id = i.purchase_item_id
      WHERE pi.purchase_id = $1
        AND i.shop_id = $2
      ORDER BY i.id
      FOR UPDATE OF i
      `,
      [purchaseId, shopId],
    );

    const inventory = inventoryResult.rows;

    // Ensure inventory records match the purchase quantities
    if (inventory.length !== expectedQuantity) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message:
          "Inventory records do not match the original purchase quantity. Cancellation blocked.",
      });
    }

    // 4. Do not cancel if any item is no longer in stock
    const unavailableItems = inventory.filter(
      (item) => item.status !== "in_stock",
    );

    if (unavailableItems.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message:
          "Purchase cannot be cancelled because some inventory items are no longer in stock.",
        unavailable_items: unavailableItems,
      });
    }

    // 5. Mark all associated inventory as cancelled
    await client.query(
      `
      UPDATE inventory_items i
      SET
        status = 'cancelled',
        updated_at = NOW()
      FROM purchase_items pi
      WHERE pi.id = i.purchase_item_id
        AND pi.purchase_id = $1
        AND i.shop_id = $2
        AND i.status = 'in_stock'
      `,
      [purchaseId, shopId],
    );

    // 6. Mark purchase as cancelled
    await client.query(
      `
      UPDATE purchases
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1 AND shop_id = $2
      `,
      [purchaseId, shopId],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully.",
      data: {
        purchase_id: purchase.id,
        purchase_number: purchase.purchase_number,
        previous_status: "received",
        status: "cancelled",
        cancelled_inventory_count: inventory.length,
        model_numbers: inventory.map((item) => item.model_number),
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Cancel purchase error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel purchase.",
    });
  } finally {
    client.release();
  }
};
