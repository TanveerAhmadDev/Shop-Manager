import type { Request, Response } from "express";

import { pool } from "../config/db.js";
import type { CreateSaleBody, PaymentMethod } from "../types/sales.types.js";

const paymentMethods: PaymentMethod[] = [
  "cash",
  "bank",
  "easypaisa",
  "jazzcash",
  "other",
];

// Convert amounts to paisa to avoid floating-point calculation problems.
const toPaisa = (value: unknown): number => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return NaN;
  }

  return Math.round(amount * 100);
};

type NormalizedSaleItem = {
  model_number: string;
  quantity: number;
  pricePaisa: number;
};

type SelectedInventoryItem = {
  id: string;
  product_id: string;
  product_name: string;
  model_number: string;
  cost_price: string | number;
};

export const createSale = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const body = req.body as CreateSaleBody;

    const {
      customer_id,
      customer,
      items,
      discount = 0,
      tax = 0,
      payment,
      notes,
      client_request_id,
    } = body;

    // ----------------------------------------
    // 1. Validate request
    // ----------------------------------------

    if (
      client_request_id !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        client_request_id,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid client request ID.",
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one sale item is required.",
      });
      return;
    }

    if (customer_id && customer) {
      res.status(400).json({
        success: false,
        message: "Provide customer_id or customer details, not both.",
      });
      return;
    }

    if (customer && !customer.customer_name?.trim()) {
      res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
      return;
    }

    const discountPaisa = toPaisa(discount);
    const taxPaisa = toPaisa(tax);
    const paymentPaisa = toPaisa(payment?.amount ?? 0);

    if (
      !Number.isSafeInteger(discountPaisa) ||
      !Number.isSafeInteger(taxPaisa) ||
      !Number.isSafeInteger(paymentPaisa) ||
      discountPaisa < 0 ||
      taxPaisa < 0 ||
      paymentPaisa < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid discount, tax or payment amount.",
      });
      return;
    }

    // ----------------------------------------
    // 2. Normalize sale items
    // ----------------------------------------

    const normalizedItems: NormalizedSaleItem[] = [];

    const modelNumbers: string[] = [];

    let subtotalPaisa = 0;
    let totalQuantity = 0;

    for (const item of items) {
      const modelNumber = item.model_number?.trim();
      const quantity = item.quantity;
      const pricePaisa = toPaisa(item.unit_sale_price);

      if (!modelNumber) {
        res.status(400).json({
          success: false,
          message: "A model number is required for every item.",
        });
        return;
      }

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: "Quantity must be a positive whole number.",
        });
        return;
      }

      if (quantity > 1000) {
        res.status(400).json({
          success: false,
          message: "Maximum quantity per item is 1000.",
        });
        return;
      }

      if (!Number.isSafeInteger(pricePaisa) || pricePaisa <= 0) {
        res.status(400).json({
          success: false,
          message: "Every item needs a valid selling price.",
        });
        return;
      }

      modelNumbers.push(modelNumber);

      normalizedItems.push({
        model_number: modelNumber,
        quantity,
        pricePaisa,
      });

      subtotalPaisa += pricePaisa * quantity;
      totalQuantity += quantity;

      if (
        !Number.isSafeInteger(subtotalPaisa) ||
        !Number.isSafeInteger(totalQuantity)
      ) {
        res.status(400).json({
          success: false,
          message: "Sale amount or quantity is too large.",
        });
        return;
      }
    }

    // Limit the total number of physical items in one sale.
    if (totalQuantity > 1000) {
      res.status(400).json({
        success: false,
        message: "Maximum total sale quantity is 1000 items.",
      });
      return;
    }

    // Prevent the same barcode from being entered twice.
    if (new Set(modelNumbers).size !== modelNumbers.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate model numbers are not allowed.",
      });
      return;
    }

    if (discountPaisa > subtotalPaisa) {
      res.status(400).json({
        success: false,
        message: "Discount cannot exceed subtotal.",
      });
      return;
    }

    const totalPaisa = subtotalPaisa - discountPaisa + taxPaisa;

    if (!Number.isSafeInteger(totalPaisa) || totalPaisa <= 0) {
      res.status(400).json({
        success: false,
        message: "Bill total must be greater than zero.",
      });
      return;
    }

    if (paymentPaisa > totalPaisa) {
      res.status(400).json({
        success: false,
        message: "Payment cannot exceed bill total.",
      });
      return;
    }

    if (
      paymentPaisa > 0 &&
      !paymentMethods.includes(payment?.payment_method as PaymentMethod)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
      return;
    }

    // ----------------------------------------
    // 3. Start transaction
    // ----------------------------------------

    await client.query("BEGIN");
    transactionStarted = true;

    const shopId = req.user!.shopId;

    // Lock shop to serialize sales and generate safe bill numbers.
    const shopResult = await client.query(
      `SELECT id
       FROM shops
       WHERE id = $1
         AND is_active = TRUE
       FOR UPDATE`,
      [shopId],
    );

    if (shopResult.rows.length === 0) {
      throw new Error("SHOP_NOT_FOUND");
    }

    // ----------------------------------------
    // 4. Check existing sale request
    // ----------------------------------------

    if (client_request_id) {
      const existingSaleResult = await client.query(
        `SELECT
           s.id AS sale_id,
           s.sale_number,
           s.sale_date,
           s.customer_id,
           s.subtotal,
           s.discount,
           s.tax,
           s.total_amount,
           COALESCE(SUM(p.amount), 0) AS paid_amount
         FROM sales s
         LEFT JOIN payments p
           ON p.sale_id = s.id
          AND p.shop_id = s.shop_id
         WHERE s.shop_id = $1
           AND s.client_request_id = $2
         GROUP BY s.id
         LIMIT 1`,
        [shopId, client_request_id],
      );

      if (existingSaleResult.rows.length > 0) {
        const existingSale = existingSaleResult.rows[0];

        const paidAmount = Number(existingSale.paid_amount);
        const existingTotal = Number(existingSale.total_amount);

        await client.query("COMMIT");
        transactionStarted = false;

        res.status(200).json({
          success: true,
          message: "Sale was already created.",
          data: {
            sale_id: existingSale.sale_id,
            sale_number: existingSale.sale_number,
            sale_date: existingSale.sale_date,
            customer_id: existingSale.customer_id,
            subtotal: existingSale.subtotal,
            discount: existingSale.discount,
            tax: existingSale.tax,
            total_amount: existingSale.total_amount,
            paid_amount: paidAmount.toFixed(2),
            remaining_balance: (existingTotal - paidAmount).toFixed(2),
          },
        });

        return;
      }
    }

    // ----------------------------------------
    // 5. Find available inventory for each line
    // ----------------------------------------

    const selectedInventoryItems: SelectedInventoryItem[] = [];
    const selectedInventoryIds: string[] = [];

    for (const item of normalizedItems) {
      // First, find the scanned item.
      // Its product_id tells us which product to sell.
      const scannedItemResult = await client.query(
        `SELECT
           i.id,
           i.product_id,
           i.model_number
         FROM inventory_items i
         WHERE i.shop_id = $1
           AND i.model_number = $2
           AND i.status = 'in_stock'
         FOR UPDATE`,
        [shopId, item.model_number],
      );

      if (scannedItemResult.rows.length === 0) {
        throw new Error("SCANNED_ITEM_UNAVAILABLE");
      }

      const scannedItem = scannedItemResult.rows[0];

      // Do not allow an inventory item to be selected twice.
      if (selectedInventoryIds.includes(scannedItem.id)) {
        throw new Error("DUPLICATE_INVENTORY_SELECTION");
      }

      // Find the requested quantity of available items
      // belonging to the same product.
      //
      // The scanned item is selected first.
      // Other available items follow it.
      const availableItemsResult = await client.query(
        `SELECT
           i.id,
           i.product_id,
           i.model_number,
           i.cost_price,
           p.product_name
         FROM inventory_items i
         JOIN products p
           ON p.id = i.product_id
          AND p.shop_id = i.shop_id
         WHERE i.shop_id = $1
           AND i.product_id = $2
           AND i.status = 'in_stock'
           AND i.id <> ALL($3::uuid[])
         ORDER BY
           CASE WHEN i.id = $4 THEN 0 ELSE 1 END,
           i.created_at ASC,
           i.id ASC
         LIMIT $5
         FOR UPDATE OF i`,
        [
          shopId,
          scannedItem.product_id,
          selectedInventoryIds,
          scannedItem.id,
          item.quantity,
        ],
      );

      const availableItems =
        availableItemsResult.rows as SelectedInventoryItem[];

      // All-or-nothing:
      // reject the complete sale if requested stock is unavailable.
      if (availableItems.length !== item.quantity) {
        throw new Error("INSUFFICIENT_PRODUCT_STOCK");
      }

      for (const inventoryItem of availableItems) {
        selectedInventoryItems.push(inventoryItem);
        selectedInventoryIds.push(inventoryItem.id);
      }
    }

    // ----------------------------------------
    // 6. Find or create customer
    // ----------------------------------------

    let finalCustomerId: string | null = null;

    if (customer_id) {
      const customerResult = await client.query(
        `SELECT id
         FROM customers
         WHERE id = $1
           AND shop_id = $2`,
        [customer_id, shopId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }

      finalCustomerId = customerResult.rows[0].id;
    } else if (customer) {
      const customerResult = await client.query(
        `INSERT INTO customers
           (shop_id, customer_name, phone, email, address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          shopId,
          customer.customer_name.trim(),
          customer.phone?.trim() || null,
          customer.email?.trim().toLowerCase() || null,
          customer.address?.trim() || null,
        ],
      );

      finalCustomerId = customerResult.rows[0].id;
    }

    // ----------------------------------------
    // 7. Generate bill number
    // ----------------------------------------

    const numberResult = await client.query(
      `SELECT
         COALESCE(
           MAX(SUBSTRING(sale_number FROM 5)::BIGINT),
           0
         ) + 1 AS next_number
       FROM sales
       WHERE shop_id = $1
         AND sale_number ~ '^SAL-[0-9]+$'`,
      [shopId],
    );

    const saleNumber = `SAL-${String(numberResult.rows[0].next_number).padStart(
      4,
      "0",
    )}`;

    // ----------------------------------------
    // 8. Create sale / bill
    // ----------------------------------------

    const saleResult = await client.query(
      `INSERT INTO sales
         (
           shop_id,
           customer_id,
           sale_number,
           subtotal,
           discount,
           tax,
           total_amount,
           notes,
           status,
           client_request_id
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9)
       RETURNING id, sale_number, sale_date, total_amount`,
      [
        shopId,
        finalCustomerId,
        saleNumber,
        (subtotalPaisa / 100).toFixed(2),
        (discountPaisa / 100).toFixed(2),
        (taxPaisa / 100).toFixed(2),
        (totalPaisa / 100).toFixed(2),
        notes?.trim() || null,
        client_request_id ?? null,
      ],
    );

    const sale = saleResult.rows[0];

    // ----------------------------------------
    // 9. Insert individual sale items
    // ----------------------------------------

    let inventoryIndex = 0;

    for (const item of normalizedItems) {
      // Each selected physical item gets its own sale_items row.
      for (let i = 0; i < item.quantity; i++) {
        const inventoryItem = selectedInventoryItems[inventoryIndex];

        if (!inventoryItem) {
          throw new Error("INVENTORY_UNAVAILABLE");
        }

        await client.query(
          `INSERT INTO sale_items
             (
               sale_id,
               inventory_item_id,
               model_number,
               product_id,
               product_name,
               quantity,
               unit_sale_price,
               unit_cost_price
             )
           VALUES ($1, $2, $3, $4, $5, 1, $6, $7)`,
          [
            sale.id,
            inventoryItem.id,
            inventoryItem.model_number,
            inventoryItem.product_id,
            inventoryItem.product_name,
            (item.pricePaisa / 100).toFixed(2),
            inventoryItem.cost_price,
          ],
        );

        // Mark this physical item as sold.
        const updateResult = await client.query(
          `UPDATE inventory_items
           SET status = 'sold',
               updated_at = NOW()
           WHERE id = $1
             AND shop_id = $2
             AND status = 'in_stock'`,
          [inventoryItem.id, shopId],
        );

        if (updateResult.rowCount !== 1) {
          throw new Error("INVENTORY_UPDATE_FAILED");
        }

        inventoryIndex++;
      }
    }

    // ----------------------------------------
    // 10. Record initial payment
    // ----------------------------------------

    if (paymentPaisa > 0) {
      await client.query(
        `INSERT INTO payments
           (
             shop_id,
             sale_id,
             amount,
             payment_method,
             payment_date,
             reference_number,
             notes
           )
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        [
          shopId,
          sale.id,
          (paymentPaisa / 100).toFixed(2),
          payment!.payment_method,
          payment?.reference_number || null,
          payment?.notes || "Initial sale payment",
        ],
      );
    }

    // ----------------------------------------
    // 11. Commit transaction
    // ----------------------------------------

    await client.query("COMMIT");
    transactionStarted = false;

    // ----------------------------------------
    // 12. Send response
    // ----------------------------------------

    res.status(201).json({
      success: true,
      message: "Sale created successfully.",
      data: {
        sale_id: sale.id,
        sale_number: sale.sale_number,
        sale_date: sale.sale_date,
        customer_id: finalCustomerId,
        subtotal: (subtotalPaisa / 100).toFixed(2),
        discount: (discountPaisa / 100).toFixed(2),
        tax: (taxPaisa / 100).toFixed(2),
        total_amount: (totalPaisa / 100).toFixed(2),
        paid_amount: (paymentPaisa / 100).toFixed(2),
        remaining_balance: ((totalPaisa - paymentPaisa) / 100).toFixed(2),
        items_sold: totalQuantity,
      },
    });
  } catch (error: unknown) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Sale transaction rollback error:", rollbackError);
      }

      transactionStarted = false;
    }

    if (error instanceof Error) {
      const knownErrors: Record<string, { status: number; message: string }> = {
        SHOP_NOT_FOUND: {
          status: 404,
          message: "Shop not found or inactive.",
        },

        SCANNED_ITEM_UNAVAILABLE: {
          status: 409,
          message:
            "The scanned model number does not exist in available inventory or has already been sold.",
        },

        INSUFFICIENT_PRODUCT_STOCK: {
          status: 409,
          message:
            "Insufficient available stock for the scanned product. No items were sold.",
        },

        DUPLICATE_INVENTORY_SELECTION: {
          status: 400,
          message: "The same inventory item cannot be selected more than once.",
        },

        INVENTORY_UNAVAILABLE: {
          status: 409,
          message: "One or more inventory items are unavailable.",
        },

        CUSTOMER_NOT_FOUND: {
          status: 404,
          message: "Customer not found in your shop.",
        },

        INVENTORY_UPDATE_FAILED: {
          status: 409,
          message: "Could not update inventory. Please try again.",
        },
      };

      const knownError = knownErrors[error.message];

      if (knownError) {
        res.status(knownError.status).json({
          success: false,
          message: knownError.message,
        });
        return;
      }
    }

    console.error("Create sale error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create sale.",
    });
  } finally {
    client.release();
  }
};
