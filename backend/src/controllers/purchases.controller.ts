import type { Request, Response } from "express";
import { pool } from "../config/db.js";
import type { CreatePurchaseBody } from "../types/purchases.types.js";

// Convert rupees into paisa to avoid floating-point calculation errors.
const toPaisa = (value: unknown): number => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("INVALID_AMOUNT");
  }

  return Math.round(amount * 100);
};

const formatMoney = (paisa: number): string => {
  return (paisa / 100).toFixed(2);
};

// POST /api/v1/purchases
export const createPurchase = async (req: Request, res: Response) => {
  const body = req.body as CreatePurchaseBody;
  const shopId = req.user!.shopId;

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      purchase_date,
      items,
      transport_cost = 0,
      other_cost = 0,
      notes,
    } = body;

    // 1. Validate purchase items.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one purchase item is required.",
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "A purchase cannot contain more than 100 product lines.",
      });
    }

    const normalizedItems = items.map((item) => {
      if (
        !item ||
        typeof item.product_id !== "string" ||
        !item.product_id.trim()
      ) {
        throw new Error("INVALID_PRODUCT");
      }

      const supplierId =
        typeof item.supplier_id === "string" && item.supplier_id.trim()
          ? item.supplier_id.trim()
          : null;

      const quantity = Number(item.quantity);

      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000) {
        throw new Error("INVALID_QUANTITY");
      }

      const unitPricePaisa = toPaisa(item.unit_purchase_price);

      if (unitPricePaisa <= 0) {
        throw new Error("INVALID_UNIT_PRICE");
      }

      return {
        productId: item.product_id.trim(),
        supplierId,
        quantity,
        unitPricePaisa,
        lineSubtotalPaisa: unitPricePaisa * quantity,
      };
    });

    // 2. Validate additional costs.
    const transportPaisa = toPaisa(transport_cost);
    const otherPaisa = toPaisa(other_cost);

    const subtotalPaisa = normalizedItems.reduce(
      (total, item) => total + item.lineSubtotalPaisa,
      0,
    );

    const extraCostPaisa = transportPaisa + otherPaisa;
    const totalPaisa = subtotalPaisa + extraCostPaisa;

    if (!Number.isSafeInteger(totalPaisa)) {
      throw new Error("INVALID_AMOUNT");
    }

    // 3. Validate purchase date.
    if (
      purchase_date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(purchase_date) ||
        !Number.isFinite(Date.parse(`${purchase_date}T00:00:00Z`)) ||
        new Date(`${purchase_date}T00:00:00Z`).toISOString().slice(0, 10) !==
          purchase_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Purchase date must be a valid YYYY-MM-DD date.",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // 4. Lock the shop to safely generate purchase and model numbers.
    const shopResult = await client.query(
      `
      SELECT id, model_code_prefix
      FROM shops
      WHERE id = $1 AND is_active = TRUE
      FOR UPDATE
      `,
      [shopId],
    );

    if (shopResult.rows.length === 0) {
      throw new Error("SHOP_NOT_FOUND");
    }

    const modelCodePrefix = String(
      shopResult.rows[0].model_code_prefix || "SHOP",
    ).toUpperCase();

    if (!/^[A-Z0-9]{1,10}$/.test(modelCodePrefix)) {
      throw new Error("INVALID_MODEL_PREFIX");
    }

    // 5. Validate all selected suppliers belong to this shop.
    const supplierIds = [
      ...new Set(
        normalizedItems
          .map((item) => item.supplierId)
          .filter((id): id is string => id !== null),
      ),
    ];

    if (supplierIds.length > 0) {
      const suppliersResult = await client.query(
        `
        SELECT id
        FROM suppliers
        WHERE shop_id = $1
          AND id = ANY($2::uuid[])
        `,
        [shopId, supplierIds],
      );

      if (suppliersResult.rows.length !== supplierIds.length) {
        throw new Error("SUPPLIER_NOT_FOUND");
      }
    }

    // 6. Validate products.
    // Use distinct IDs because the same product may appear
    // in multiple purchase lines with different suppliers.
    const productIds = [
      ...new Set(normalizedItems.map((item) => item.productId)),
    ];

    const productsResult = await client.query(
      `
  SELECT id, product_name
FROM products
  WHERE shop_id = $1
    AND id = ANY($2::uuid[])
    AND is_active = TRUE
  `,
      [shopId, productIds],
    );

    if (productsResult.rows.length !== productIds.length) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const productNames = new Map<string, string>(
      productsResult.rows.map((product) => [product.id, product.product_name]),
    );

    // 7. Generate purchase number.
    const purchaseNumberResult = await client.query(
      `
      SELECT COALESCE(
        MAX(
          SUBSTRING(purchase_number FROM '^PUR-([0-9]+)$')::BIGINT
        ),
        0
      ) + 1 AS next_number
      FROM purchases
      WHERE shop_id = $1
      `,
      [shopId],
    );

    const purchaseNumber = `PUR-${String(
      purchaseNumberResult.rows[0].next_number,
    ).padStart(4, "0")}`;

    // 8. Insert purchase header.
    // supplier_id is kept for backward compatibility with old records.
    // New supplier information is stored on purchase_items.
    const purchaseResult = await client.query(
      `
      INSERT INTO purchases (
        shop_id,
        supplier_id,
        purchase_number,
        purchase_date,
        subtotal,
        transport_cost,
        other_cost,
        total_amount,
        notes,
        status
      )
      VALUES (
        $1, NULL, $2, COALESCE($3::date, CURRENT_DATE),
        $4, $5, $6, $7, $8, 'received'
      )
      RETURNING id, purchase_number, purchase_date
      `,
      [
        shopId,
        purchaseNumber,
        purchase_date || null,
        formatMoney(subtotalPaisa),
        formatMoney(transportPaisa),
        formatMoney(otherPaisa),
        formatMoney(totalPaisa),
        notes?.trim() || null,
      ],
    );

    const purchase = purchaseResult.rows[0];

    // 9. Find the next available model number.
    const modelNumberResult = await client.query(
      `
      SELECT COALESCE(
        MAX(
          SUBSTRING(model_number FROM '[0-9]+$')::BIGINT
        ),
        0
      ) + 1 AS next_number
      FROM inventory_items
      WHERE shop_id = $1
        AND model_number ~ ('^' || $2 || '-[0-9]+$')
      `,
      [shopId, modelCodePrefix],
    );

    let nextModelNumber = Number(modelNumberResult.rows[0].next_number);

    // Track the remaining shared extra costs.
    let remainingExtraPaisa = extraCostPaisa;

    const createdItems = [];

    // 10. Insert purchase lines and inventory records.
    for (let index = 0; index < normalizedItems.length; index++) {
      const item = normalizedItems[index];

      // Allocate shared costs proportionally.
      // The final line receives any rounding remainder.
      const allocatedExtraPaisa =
        index === normalizedItems.length - 1
          ? remainingExtraPaisa
          : Math.round(
              (extraCostPaisa * item.lineSubtotalPaisa) / subtotalPaisa,
            );

      remainingExtraPaisa -= allocatedExtraPaisa;

      const totalLandedCostPaisa = item.lineSubtotalPaisa + allocatedExtraPaisa;

      const landedUnitCostPaisa = Math.round(
        totalLandedCostPaisa / item.quantity,
      );

      // Save the supplier against this individual purchase line.
      const purchaseItemResult = await client.query(
        `
        INSERT INTO purchase_items (
          purchase_id,
          product_id,
          supplier_id,
          quantity,
          unit_purchase_price,
          allocated_extra_cost,
          landed_unit_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          purchase.id,
          item.productId,
          item.supplierId,
          item.quantity,
          formatMoney(item.unitPricePaisa),
          formatMoney(allocatedExtraPaisa),
          formatMoney(landedUnitCostPaisa),
        ],
      );

      const purchaseItemId = purchaseItemResult.rows[0].id;

      // Generate one model number for every physical item.
      const inventoryResult = await client.query(
        `
        INSERT INTO inventory_items (
          shop_id,
          product_id,
          purchase_item_id,
          model_number,
          cost_price,
          status
        )
        SELECT
          $1,
          $2,
          $3,
          $4 || '-' || LPAD(
            ($5::BIGINT + generated.sequence_number)::TEXT,
            6,
            '0'
          ),
          $6,
          'in_stock'
        FROM generate_series(0, $7::INTEGER - 1)
          AS generated(sequence_number)
        RETURNING id, model_number, cost_price, status
        `,
        [
          shopId,
          item.productId,
          purchaseItemId,
          modelCodePrefix,
          nextModelNumber,
          formatMoney(landedUnitCostPaisa),
          item.quantity,
        ],
      );

      createdItems.push({
        purchase_item_id: purchaseItemId,
        product_id: item.productId,
        product_name: productNames.get(item.productId),
        supplier_id: item.supplierId,
        quantity: item.quantity,
        unit_purchase_price: formatMoney(item.unitPricePaisa),
        allocated_extra_cost: formatMoney(allocatedExtraPaisa),
        landed_unit_cost: formatMoney(landedUnitCostPaisa),
        inventory: inventoryResult.rows,
      });

      nextModelNumber += item.quantity;
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Purchase recorded and inventory added successfully.",
      data: {
        purchase_id: purchase.id,
        purchase_number: purchase.purchase_number,
        purchase_date: purchase.purchase_date,
        subtotal: formatMoney(subtotalPaisa),
        transport_cost: formatMoney(transportPaisa),
        other_cost: formatMoney(otherPaisa),
        total_amount: formatMoney(totalPaisa),
        total_quantity: normalizedItems.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
        items: createdItems,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    console.error("Create purchase error:", error);

    const errors: Record<string, { status: number; message: string }> = {
      INVALID_AMOUNT: {
        status: 400,
        message: "Purchase amounts must be valid non-negative numbers.",
      },
      INVALID_PRODUCT: {
        status: 400,
        message: "Every item must have a valid product ID.",
      },
      INVALID_QUANTITY: {
        status: 400,
        message:
          "Each quantity must be a positive whole number (maximum 1000).",
      },
      INVALID_UNIT_PRICE: {
        status: 400,
        message: "Unit purchase price must be greater than zero.",
      },
      SHOP_NOT_FOUND: {
        status: 404,
        message: "Active shop not found.",
      },
      SUPPLIER_NOT_FOUND: {
        status: 404,
        message: "One or more suppliers were not found in your shop.",
      },
      PRODUCT_NOT_FOUND: {
        status: 404,
        message: "One or more active products were not found in your shop.",
      },
      INVALID_MODEL_PREFIX: {
        status: 400,
        message: "Shop model-number prefix is invalid.",
      },
    };

    const knownError = errors[message];

    return res.status(knownError?.status || 500).json({
      success: false,
      message: knownError?.message || "Failed to record purchase.",
    });
  } finally {
    client.release();
  }
};

// POST /api/v1/purchases
// export const createPurchase = async (req: Request, res: Response) => {
//   const body = req.body as CreatePurchaseBody;
//   const shopId = req.user!.shopId;

//   const client = await pool.connect();
//   let transactionStarted = false;

//   try {
//     const {
//       purchase_date,
//       items,
//       transport_cost = 0,
//       other_cost = 0,
//       notes,
//     } = body;

//     // 1. Validate purchase items.
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one purchase item is required.",
//       });
//     }

//     if (items.length > 100) {
//       return res.status(400).json({
//         success: false,
//         message: "A purchase cannot contain more than 100 product lines.",
//       });
//     }

//     const normalizedItems = items.map((item) => {
//       if (
//         !item ||
//         typeof item.product_id !== "string" ||
//         !item.product_id.trim()
//       ) {
//         throw new Error("INVALID_PRODUCT");
//       }

//       const supplierId =
//         typeof item.supplier_id === "string" && item.supplier_id.trim()
//           ? item.supplier_id.trim()
//           : null;

//       const quantity = Number(item.quantity);

//       if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000) {
//         throw new Error("INVALID_QUANTITY");
//       }

//       const unitPricePaisa = toPaisa(item.unit_purchase_price);

//       if (unitPricePaisa <= 0) {
//         throw new Error("INVALID_UNIT_PRICE");
//       }

//       return {
//         productId: item.product_id.trim(),
//         supplierId,
//         quantity,
//         unitPricePaisa,
//         lineSubtotalPaisa: unitPricePaisa * quantity,
//       };
//     });

//     // 2. Validate additional costs.
//     const transportPaisa = toPaisa(transport_cost);
//     const otherPaisa = toPaisa(other_cost);

//     if (
//       !Number.isSafeInteger(transportPaisa) ||
//       !Number.isSafeInteger(otherPaisa) ||
//       transportPaisa < 0 ||
//       otherPaisa < 0
//     ) {
//       throw new Error("INVALID_AMOUNT");
//     }

//     const subtotalPaisa = normalizedItems.reduce(
//       (total, item) => total + item.lineSubtotalPaisa,
//       0,
//     );

//     const extraCostPaisa = transportPaisa + otherPaisa;
//     const totalPaisa = subtotalPaisa + extraCostPaisa;

//     if (
//       !Number.isSafeInteger(subtotalPaisa) ||
//       !Number.isSafeInteger(extraCostPaisa) ||
//       !Number.isSafeInteger(totalPaisa)
//     ) {
//       throw new Error("INVALID_AMOUNT");
//     }

//     // 3. Validate purchase date.
//     if (
//       purchase_date &&
//       (!/^\d{4}-\d{2}-\d{2}$/.test(purchase_date) ||
//         !Number.isFinite(Date.parse(`${purchase_date}T00:00:00Z`)) ||
//         new Date(`${purchase_date}T00:00:00Z`).toISOString().slice(0, 10) !==
//           purchase_date)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Purchase date must be a valid YYYY-MM-DD date.",
//       });
//     }

//     await client.query("BEGIN");
//     transactionStarted = true;

//     // 4. Lock the shop to safely generate purchase and model numbers.
//     const shopResult = await client.query(
//       `
//       SELECT id, model_code_prefix
//       FROM shops
//       WHERE id = $1 AND is_active = TRUE
//       FOR UPDATE
//       `,
//       [shopId],
//     );

//     if (shopResult.rows.length === 0) {
//       throw new Error("SHOP_NOT_FOUND");
//     }

//     const modelCodePrefix = String(
//       shopResult.rows[0].model_code_prefix || "SHOP",
//     ).toUpperCase();

//     if (!/^[A-Z0-9]{1,10}$/.test(modelCodePrefix)) {
//       throw new Error("INVALID_MODEL_PREFIX");
//     }

//     // 5. Validate all selected suppliers belong to this shop.
//     const supplierIds = [
//       ...new Set(
//         normalizedItems
//           .map((item) => item.supplierId)
//           .filter((id): id is string => id !== null),
//       ),
//     ];

//     if (supplierIds.length > 0) {
//       const suppliersResult = await client.query(
//         `
//         SELECT id
//         FROM suppliers
//         WHERE shop_id = $1
//           AND id = ANY($2::uuid[])
//         `,
//         [shopId, supplierIds],
//       );

//       if (suppliersResult.rows.length !== supplierIds.length) {
//         throw new Error("SUPPLIER_NOT_FOUND");
//       }
//     }

//     // 6. Validate products and retrieve their tracking types.
//     const productIds = [
//       ...new Set(normalizedItems.map((item) => item.productId)),
//     ];

//     const productsResult = await client.query(
//       `
//       SELECT id, product_name, tracking_type
//       FROM products
//       WHERE shop_id = $1
//         AND id = ANY($2::uuid[])
//         AND is_active = TRUE
//       `,
//       [shopId, productIds],
//     );

//     if (productsResult.rows.length !== productIds.length) {
//       throw new Error("PRODUCT_NOT_FOUND");
//     }

//     const productNames = new Map<string, string>(
//       productsResult.rows.map((product) => [product.id, product.product_name]),
//     );

//     const productTrackingTypes = new Map<string, "individual" | "bulk">(
//       productsResult.rows.map((product) => [
//         product.id,
//         product.tracking_type as "individual" | "bulk",
//       ]),
//     );

//     // Validate tracking types.
//     for (const item of normalizedItems) {
//       const trackingType = productTrackingTypes.get(item.productId);

//       if (trackingType !== "individual" && trackingType !== "bulk") {
//         throw new Error("INVALID_TRACKING_TYPE");
//       }
//     }

//     // 7. Generate purchase number.
//     const purchaseNumberResult = await client.query(
//       `
//       SELECT COALESCE(
//         MAX(
//           SUBSTRING(purchase_number FROM '^PUR-([0-9]+)$')::BIGINT
//         ),
//         0
//       ) + 1 AS next_number
//       FROM purchases
//       WHERE shop_id = $1
//       `,
//       [shopId],
//     );

//     const purchaseNumber = `PUR-${String(
//       purchaseNumberResult.rows[0].next_number,
//     ).padStart(4, "0")}`;

//     // 8. Insert purchase header.
//     const purchaseResult = await client.query(
//       `
//       INSERT INTO purchases (
//         shop_id,
//         supplier_id,
//         purchase_number,
//         purchase_date,
//         subtotal,
//         transport_cost,
//         other_cost,
//         total_amount,
//         notes,
//         status
//       )
//       VALUES (
//         $1, NULL, $2, COALESCE($3::date, CURRENT_DATE),
//         $4, $5, $6, $7, $8, 'received'
//       )
//       RETURNING id, purchase_number, purchase_date
//       `,
//       [
//         shopId,
//         purchaseNumber,
//         purchase_date || null,
//         formatMoney(subtotalPaisa),
//         formatMoney(transportPaisa),
//         formatMoney(otherPaisa),
//         formatMoney(totalPaisa),
//         notes?.trim() || null,
//       ],
//     );

//     const purchase = purchaseResult.rows[0];

//     // 9. Find the next available model number.
//     // Only individual products will consume these numbers.
//     const modelNumberResult = await client.query(
//       `
//       SELECT COALESCE(
//         MAX(
//           SUBSTRING(model_number FROM '[0-9]+$')::BIGINT
//         ),
//         0
//       ) + 1 AS next_number
//       FROM inventory_items
//       WHERE shop_id = $1
//         AND model_number ~ ('^' || $2 || '-[0-9]+$')
//       `,
//       [shopId, modelCodePrefix],
//     );

//     let nextModelNumber = Number(modelNumberResult.rows[0].next_number);

//     // Track remaining shared extra costs.
//     let remainingExtraPaisa = extraCostPaisa;

//     const createdItems = [];

//     // 10. Insert purchase lines and handle stock tracking.
//     for (let index = 0; index < normalizedItems.length; index++) {
//       const item = normalizedItems[index];

//       const trackingType = productTrackingTypes.get(item.productId)!;

//       // Allocate shared costs proportionally.
//       // The final line receives any rounding remainder.
//       const allocatedExtraPaisa =
//         index === normalizedItems.length - 1
//           ? remainingExtraPaisa
//           : Math.round(
//               (extraCostPaisa * item.lineSubtotalPaisa) / subtotalPaisa,
//             );

//       remainingExtraPaisa -= allocatedExtraPaisa;

//       const totalLandedCostPaisa = item.lineSubtotalPaisa + allocatedExtraPaisa;

//       const landedUnitCostPaisa = Math.round(
//         totalLandedCostPaisa / item.quantity,
//       );

//       // Bulk products maintain their stock in purchase batches.
//       // Individual products maintain stock through inventory_items.
//       const quantityRemaining = trackingType === "bulk" ? item.quantity : 0;

//       // 10a. Insert purchase line.
//       const purchaseItemResult = await client.query(
//         `
//         INSERT INTO purchase_items (
//           purchase_id,
//           product_id,
//           supplier_id,
//           quantity,
//           quantity_remaining,
//           unit_purchase_price,
//           allocated_extra_cost,
//           landed_unit_cost
//         )
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//         RETURNING id
//         `,
//         [
//           purchase.id,
//           item.productId,
//           item.supplierId,
//           item.quantity,
//           quantityRemaining,
//           formatMoney(item.unitPricePaisa),
//           formatMoney(allocatedExtraPaisa),
//           formatMoney(landedUnitCostPaisa),
//         ],
//       );

//       const purchaseItemId = purchaseItemResult.rows[0].id;

//       // 10b. Generate individual inventory records only
//       // for products using individual tracking.
//       let inventoryRows: {
//         id: string;
//         model_number: string;
//         cost_price: string;
//         status: string;
//       }[] = [];

//       if (trackingType === "individual") {
//         const inventoryResult = await client.query(
//           `
//           INSERT INTO inventory_items (
//             shop_id,
//             product_id,
//             purchase_item_id,
//             model_number,
//             cost_price,
//             status
//           )
//           SELECT
//             $1,
//             $2,
//             $3,
//             $4 || '-' || LPAD(
//               ($5::BIGINT + generated.sequence_number)::TEXT,
//               6,
//               '0'
//             ),
//             $6,
//             'in_stock'
//           FROM generate_series(0, $7::INTEGER - 1)
//             AS generated(sequence_number)
//           RETURNING id, model_number, cost_price, status
//           `,
//           [
//             shopId,
//             item.productId,
//             purchaseItemId,
//             modelCodePrefix,
//             nextModelNumber,
//             formatMoney(landedUnitCostPaisa),
//             item.quantity,
//           ],
//         );

//         inventoryRows = inventoryResult.rows;

//         // Only individual products consume model numbers.
//         nextModelNumber += item.quantity;
//       }

//       createdItems.push({
//         purchase_item_id: purchaseItemId,
//         product_id: item.productId,
//         product_name: productNames.get(item.productId),
//         supplier_id: item.supplierId,
//         tracking_type: trackingType,
//         quantity: item.quantity,
//         quantity_remaining: quantityRemaining,
//         unit_purchase_price: formatMoney(item.unitPricePaisa),
//         allocated_extra_cost: formatMoney(allocatedExtraPaisa),
//         landed_unit_cost: formatMoney(landedUnitCostPaisa),
//         inventory: inventoryRows,
//       });
//     }

//     // 11. Commit transaction.
//     await client.query("COMMIT");
//     transactionStarted = false;

//     return res.status(201).json({
//       success: true,
//       message: "Purchase recorded and inventory added successfully.",
//       data: {
//         purchase_id: purchase.id,
//         purchase_number: purchase.purchase_number,
//         purchase_date: purchase.purchase_date,
//         subtotal: formatMoney(subtotalPaisa),
//         transport_cost: formatMoney(transportPaisa),
//         other_cost: formatMoney(otherPaisa),
//         total_amount: formatMoney(totalPaisa),
//         total_quantity: normalizedItems.reduce(
//           (total, item) => total + item.quantity,
//           0,
//         ),
//         items: createdItems,
//       },
//     });
//   } catch (error) {
//     if (transactionStarted) {
//       await client.query("ROLLBACK");
//     }

//     const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

//     console.error("Create purchase error:", error);

//     const errors: Record<string, { status: number; message: string }> = {
//       INVALID_AMOUNT: {
//         status: 400,
//         message: "Purchase amounts must be valid non-negative numbers.",
//       },
//       INVALID_PRODUCT: {
//         status: 400,
//         message: "Every item must have a valid product ID.",
//       },
//       INVALID_QUANTITY: {
//         status: 400,
//         message:
//           "Each quantity must be a positive whole number (maximum 1000).",
//       },
//       INVALID_UNIT_PRICE: {
//         status: 400,
//         message: "Unit purchase price must be greater than zero.",
//       },
//       INVALID_TRACKING_TYPE: {
//         status: 400,
//         message: "One or more products have an invalid tracking type.",
//       },
//       SHOP_NOT_FOUND: {
//         status: 404,
//         message: "Active shop not found.",
//       },
//       SUPPLIER_NOT_FOUND: {
//         status: 404,
//         message: "One or more suppliers were not found in your shop.",
//       },
//       PRODUCT_NOT_FOUND: {
//         status: 404,
//         message: "One or more active products were not found in your shop.",
//       },
//       INVALID_MODEL_PREFIX: {
//         status: 400,
//         message: "Shop model-number prefix is invalid.",
//       },
//     };

//     const knownError = errors[message];

//     return res.status(knownError?.status || 500).json({
//       success: false,
//       message: knownError?.message || "Failed to record purchase.",
//     });
//   } finally {
//     client.release();
//   }
// };
