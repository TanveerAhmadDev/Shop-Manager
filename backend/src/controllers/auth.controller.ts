import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { pool } from "../config/db.js";
import {
  generateAccessToken,
  setAuthCookie,
  clearAuthCookie,
  type UserRole,
} from "../utils/jwt.js";

// REGISTER SHOP OWNER
export const register = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { shop_name, full_name, email, password } = req.body;

    // Validate required fields
    if (
      !shop_name?.trim() ||
      !full_name?.trim() ||
      !email?.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "Shop name, full name, email and password are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
      return;
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 12);

    // Start transaction
    await client.query("BEGIN");
    transactionStarted = true;

    // Check whether email already exists
    const existingUser = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail],
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
      return;
    }

    // Create shop
    const shopResult = await client.query(
      `INSERT INTO shops (shop_name, email)
       VALUES ($1, $2)
       RETURNING id, shop_name`,
      [shop_name.trim(), normalizedEmail],
    );

    const shop = shopResult.rows[0];

    // Create owner account
    const userResult = await client.query(
      `INSERT INTO users
         (shop_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, shop_id, full_name, email, role`,
      [shop.id, full_name.trim(), normalizedEmail, passwordHash],
    );

    const user = userResult.rows[0];

    // Commit transaction
    await client.query("COMMIT");
    transactionStarted = false;

    // Generate login token
    const token = generateAccessToken({
      userId: user.id,
      shopId: user.shop_id,
      role: user.role as UserRole,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Shop and owner account created successfully.",
      data: {
        shop: {
          id: shop.id,
          shop_name: shop.shop_name,
        },
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error: unknown) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    // PostgreSQL unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
      return;
    }

    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register shop.",
    });
  } finally {
    client.release();
  }
};

// LOGIN

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user and associated shop
    const result = await pool.query(
      `SELECT
         u.id,
         u.shop_id,
         u.full_name,
         u.email,
         u.password_hash,
         u.role,
         u.is_active,
         s.is_active AS shop_is_active
       FROM users u
       JOIN shops s ON s.id = u.shop_id
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const user = result.rows[0];

    // Verify password first
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Check whether the shop is active
    if (!user.shop_is_active) {
      res.status(403).json({
        success: false,
        message: "Your shop is inactive. Please contact support.",
      });
      return;
    }

    // Check whether the user account is active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
      return;
    }

    // Generate JWT
    const token = generateAccessToken({
      userId: user.id,
      shopId: user.shop_id,
      role: user.role as UserRole,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: user.id,
          shop_id: user.shop_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

// LOGOUT
export const logout = (_req: Request, res: Response): void => {
  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// GET LOGGED-IN USER
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, shop_id, full_name, email, role
       FROM users
       WHERE id = $1
         AND is_active = TRUE`,
      [req.user?.userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get user information.",
    });
  }
};
