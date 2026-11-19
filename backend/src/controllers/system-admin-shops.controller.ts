import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

// Generate a prefix from the shop name.
// Example: Mardan Furniture House -> MFH
// Example: Al-Jannat Sons -> AJS
function generateModelCodePrefix(shopName: string): string {
  const words = shopName
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 10)
    .toUpperCase();
}

// Create a new shop and its owner account.
export const createShop = async (req: Request, res: Response) => {
  const { shop_name, phone, email, address, owner } = req.body;

  // Validate shop information.
  if (typeof shop_name !== "string" || !shop_name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Shop name is required.",
    });
  }

  // Validate owner information.
  if (
    !owner ||
    typeof owner.full_name !== "string" ||
    !owner.full_name.trim() ||
    typeof owner.email !== "string" ||
    !owner.email.trim() ||
    typeof owner.password !== "string" ||
    owner.password.length < 8
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid owner name, email and password (minimum 8 characters) are required.",
    });
  }

  // Validate optional shop fields.
  if (
    (phone != null && typeof phone !== "string") ||
    (email != null && typeof email !== "string") ||
    (address != null && typeof address !== "string")
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid shop contact information.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const shopEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : null;

    const ownerEmail = owner.email.trim().toLowerCase();

    // Hash the owner's password.
    const passwordHash = await bcrypt.hash(owner.password, 12);

    // Generate the shop's model number prefix.
    const modelCodePrefix = generateModelCodePrefix(shop_name);

    // Create the shop.
    const shopResult = await client.query(
      `INSERT INTO shops (
        shop_name,
        phone,
        email,
        address,
        model_code_prefix,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *`,
      [
        shop_name.trim(),
        phone?.trim() || null,
        shopEmail,
        address?.trim() || null,
        modelCodePrefix,
      ],
    );

    const shop = shopResult.rows[0];

    // Create the first owner account for this shop.
    const ownerResult = await client.query(
      `INSERT INTO users (
        shop_id,
        full_name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'owner', TRUE)
      RETURNING id, shop_id, full_name, email, role, is_active, created_at`,
      [shop.id, owner.full_name.trim(), ownerEmail, passwordHash],
    );

    const createdOwner = ownerResult.rows[0];

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Shop and owner account created successfully.",
      data: {
        shop,
        owner: createdOwner,
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    console.error("Create shop error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this owner email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create shop.",
    });
  } finally {
    client.release();
  }
};

// Get all shops with search and pagination.
export const getAllShops = async (req: Request, res: Response) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status =
      typeof req.query.status === "string" ? req.query.status : "all";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(s.shop_name ILIKE $${values.length}
          OR s.email ILIKE $${values.length}
          OR s.phone ILIKE $${values.length})`,
      );
    }

    if (status === "active") {
      conditions.push("s.is_active = TRUE");
    } else if (status === "inactive") {
      conditions.push("s.is_active = FALSE");
    } else if (status !== "all") {
      return res.status(400).json({
        success: false,
        message: "Status must be active, inactive or all.",
      });
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total number of matching shops.
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM shops s
       ${whereClause}`,
      values,
    );

    const total = countResult.rows[0].total;

    // Get shops and their owner information.
    const shopsResult = await pool.query(
      `SELECT
        s.id,
        s.shop_name,
        s.phone,
        s.email,
        s.address,
        s.model_code_prefix,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.printing_enabled,

        u.id AS owner_id,
        u.full_name AS owner_name,
        u.email AS owner_email

      FROM shops s

      LEFT JOIN LATERAL (
        SELECT id, full_name, email
        FROM users
        WHERE shop_id = s.id AND role = 'owner'
        ORDER BY created_at ASC
        LIMIT 1
      ) u ON TRUE

      ${whereClause}

      ORDER BY s.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return res.status(200).json({
      success: true,
      message: "Shops fetched successfully.",
      data: shopsResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get shops error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shops.",
    });
  }
};

// Get one shop and its owner information.
export const getShopById = async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;

    const result = await pool.query(
      `SELECT
        s.id,
        s.shop_name,
        s.phone,
        s.email,
        s.address,
        s.model_code_prefix,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.printing_enabled,

        u.id AS owner_id,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.is_active AS owner_is_active

      FROM shops s

      LEFT JOIN LATERAL (
        SELECT id, full_name, email, is_active
        FROM users
        WHERE shop_id = s.id AND role = 'owner'
        ORDER BY created_at ASC
        LIMIT 1
      ) u ON TRUE

      WHERE s.id = $1`,
      [shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop details fetched successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get shop details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop details.",
    });
  }
};

// Activate or deactivate a shop.
export const updateShopStatus = async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false.",
      });
    }

    const result = await pool.query(
      `UPDATE shops
       SET
         is_active = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, shop_name, is_active, updated_at`,
      [is_active, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: is_active
        ? "Shop activated successfully."
        : "Shop deactivated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update shop status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update shop status.",
    });
  }
};

// Enable or disable printing for a shop.
export const updateShopPrintingPermission = async (
  req: Request,
  res: Response,
) => {
  try {
    const { shopId } = req.params;
    const { printing_enabled } = req.body;

    if (typeof printing_enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "printing_enabled must be true or false.",
      });
    }

    const result = await pool.query(
      `
      UPDATE shops
      SET
        printing_enabled = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, shop_name, printing_enabled, updated_at
      `,
      [printing_enabled, shopId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: printing_enabled
        ? "Printing enabled successfully."
        : "Printing disabled successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update shop printing permission error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update printing permission.",
    });
  }
};
