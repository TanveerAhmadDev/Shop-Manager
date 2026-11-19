import type { Request, Response } from "express";
import { pool } from "../config/db.js";

// --------------------------------------------------
// Shared types and helper functions
// --------------------------------------------------

interface ProductBody {
  category_id?: string | null;
  product_name?: string;
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  color?: string | null;
}

const isOptionalText = (value: unknown): boolean => {
  return value === undefined || value === null || typeof value === "string";
};

// --------------------------------------------------
// Create a new furniture product
// --------------------------------------------------

export const createProduct = async (req: Request, res: Response) => {
  const shopId = req.user?.shopId;

  const { category_id, product_name, description, brand, material, color } =
    req.body as ProductBody;

  if (!shopId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (typeof product_name !== "string" || !product_name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Product name is required.",
    });
  }

  if (
    !isOptionalText(description) ||
    !isOptionalText(brand) ||
    !isOptionalText(material) ||
    !isOptionalText(color)
  ) {
    return res.status(400).json({
      success: false,
      message: "Product specifications must be valid text values.",
    });
  }

  if (
    category_id !== undefined &&
    category_id !== null &&
    (typeof category_id !== "string" || !category_id.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product category.",
    });
  }

  try {
    // Make sure the selected category belongs to this shop.
    if (category_id) {
      const categoryResult = await pool.query(
        `SELECT id
         FROM categories
         WHERE id = $1 AND shop_id = $2`,
        [category_id, shopId],
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product category.",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO products (
        shop_id,
        category_id,
        product_name,
        description,
        brand,
        material,
        color,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *`,
      [
        shopId,
        category_id || null,
        product_name.trim(),
        description?.trim() || null,
        brand?.trim() || null,
        material?.trim() || null,
        color?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create product.",
    });
  }
};

// --------------------------------------------------
// Get all products with search and pagination
// --------------------------------------------------

export const getProducts = async (req: Request, res: Response) => {
  const shopId = req.user?.shopId;

  if (!shopId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const categoryId =
      typeof req.query.category_id === "string" ? req.query.category_id : null;

    const status =
      typeof req.query.status === "string" ? req.query.status : "active";

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "10"), 10) || 10),
    );

    const offset = (page - 1) * limit;

    if (!["active", "inactive", "all"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status filter.",
      });
    }

    const values: unknown[] = [shopId];
    let conditions = "WHERE p.shop_id = $1";

    if (search) {
      values.push(`%${search}%`);

      conditions += ` AND (
        p.product_name ILIKE $${values.length}
        OR p.brand ILIKE $${values.length}
        OR p.material ILIKE $${values.length}
      )`;
    }

    if (categoryId) {
      values.push(categoryId);
      conditions += ` AND p.category_id = $${values.length}`;
    }

    if (status === "active") {
      conditions += " AND COALESCE(p.is_active, TRUE) = TRUE";
    } else if (status === "inactive") {
      conditions += " AND COALESCE(p.is_active, TRUE) = FALSE";
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM products p
       ${conditions}`,
      values,
    );

    const total = countResult.rows[0].total;

    const productsResult = await pool.query(
      `
      SELECT
        p.id,
        p.category_id,
        p.product_name,
        p.description,
        p.brand,
        p.material,
        p.color,
        p.is_active,
        p.created_at,
        p.updated_at,
        c.name AS category_name,

        -- Available individual inventory pieces
        COALESCE(stock.available_quantity, 0)::INTEGER
          AS available_quantity,

        -- Average cost of available individual inventory
        COALESCE(stock.average_landed_unit_cost, 0)
          AS average_landed_unit_cost

      FROM products p

      LEFT JOIN categories c
        ON c.id = p.category_id
        AND c.shop_id = p.shop_id

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS available_quantity,
          ROUND(AVG(i.cost_price), 2) AS average_landed_unit_cost
        FROM inventory_items i
        WHERE i.product_id = p.id
          AND i.shop_id = p.shop_id
          AND i.status = 'in_stock'
      ) stock ON TRUE

      ${conditions}

      ORDER BY p.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
      `,
      [...values, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      data: productsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products.",
    });
  }
};

// --------------------------------------------------
// Get one product
// --------------------------------------------------

export const getProductById = async (req: Request, res: Response) => {
  const shopId = req.user?.shopId;
  const productId = req.params.productId;

  if (!shopId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (typeof productId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
        p.*,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c
        ON c.id = p.category_id
        AND c.shop_id = p.shop_id
      WHERE p.id = $1 AND p.shop_id = $2`,
      [productId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product.",
    });
  }
};

// --------------------------------------------------
// Update product information
// --------------------------------------------------

export const updateProduct = async (req: Request, res: Response) => {
  const shopId = req.user?.shopId;
  const productId = req.params.productId;

  if (!shopId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (typeof productId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  const { category_id, product_name, description, brand, material, color } =
    req.body as ProductBody;

  if (
    product_name !== undefined &&
    (typeof product_name !== "string" || !product_name.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Product name cannot be empty.",
    });
  }

  if (
    !isOptionalText(description) ||
    !isOptionalText(brand) ||
    !isOptionalText(material) ||
    !isOptionalText(color)
  ) {
    return res.status(400).json({
      success: false,
      message: "Product specifications must be valid text values.",
    });
  }

  if (
    category_id !== undefined &&
    category_id !== null &&
    (typeof category_id !== "string" || !category_id.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product category.",
    });
  }

  try {
    // Check whether the product exists in this shop.
    const existingResult = await pool.query(
      `SELECT *
       FROM products
       WHERE id = $1 AND shop_id = $2`,
      [productId, shopId],
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const existing = existingResult.rows[0];

    // Make sure the selected category belongs to this shop.
    if (category_id) {
      const categoryResult = await pool.query(
        `SELECT id
         FROM categories
         WHERE id = $1 AND shop_id = $2`,
        [category_id, shopId],
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product category.",
        });
      }
    }

    // Preserve existing values when a field is not supplied.
    const nextCategoryId =
      category_id === undefined ? existing.category_id : category_id;

    const nextProductName =
      product_name === undefined ? existing.product_name : product_name.trim();

    const nextDescription =
      description === undefined
        ? existing.description
        : description?.trim() || null;

    const nextBrand =
      brand === undefined ? existing.brand : brand?.trim() || null;

    const nextMaterial =
      material === undefined ? existing.material : material?.trim() || null;

    const nextColor =
      color === undefined ? existing.color : color?.trim() || null;

    const result = await pool.query(
      `UPDATE products
       SET
         category_id = $1,
         product_name = $2,
         description = $3,
         brand = $4,
         material = $5,
         color = $6,
         updated_at = NOW()
       WHERE id = $7 AND shop_id = $8
       RETURNING *`,
      [
        nextCategoryId,
        nextProductName,
        nextDescription,
        nextBrand,
        nextMaterial,
        nextColor,
        productId,
        shopId,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update product.",
    });
  }
};

// --------------------------------------------------
// Activate or deactivate a product
// --------------------------------------------------

export const updateProductStatus = async (req: Request, res: Response) => {
  const shopId = req.user?.shopId;
  const productId = req.params.productId;
  const { is_active } = req.body;

  if (!shopId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (typeof productId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  if (typeof is_active !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "is_active must be true or false.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND shop_id = $3
       RETURNING id, product_name, is_active`,
      [is_active, productId, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update product status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update product status.",
    });
  }
};
