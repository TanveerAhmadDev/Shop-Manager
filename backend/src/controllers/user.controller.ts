import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { pool } from "../config/db.js";

// GET ALL USERS IN THE CURRENT SHOP
export const getShopUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         full_name,
         email,
         role,
         is_active,
         created_at
       FROM users
       WHERE shop_id = $1
       ORDER BY created_at DESC`,
      [req.user!.shopId],
    );

    res.status(200).json({
      success: true,
      results: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get shop users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve shop users.",
    });
  }
};

// CREATE HELPER ACCOUNT
export const createHelper = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name?.trim() || !email?.trim() || !password) {
      res.status(400).json({
        success: false,
        message: "Full name, email and password are required.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users
         (shop_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'helper')
       RETURNING
         id,
         shop_id,
         full_name,
         email,
         role,
         is_active,
         created_at`,
      [req.user!.shopId, full_name.trim(), normalizedEmail, passwordHash],
    );

    res.status(201).json({
      success: true,
      message: "Helper account created successfully.",
      data: result.rows[0],
    });
  } catch (error: unknown) {
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

    console.error("Create helper error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create helper account.",
    });
  }
};

// ACTIVATE OR DEACTIVATE HELPER
export const updateHelperStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      res.status(400).json({
        success: false,
        message: "is_active must be true or false.",
      });
      return;
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = $2
         AND shop_id = $3
         AND role = 'helper'
       RETURNING id, full_name, email, role, is_active`,
      [is_active, userId, req.user!.shopId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Helper not found in your shop.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: is_active
        ? "Helper activated successfully."
        : "Helper deactivated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update helper status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update helper status.",
    });
  }
};
