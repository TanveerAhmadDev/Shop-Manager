import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { pool } from "../config/db.js";
import { generateSystemAdminToken } from "../utils/system-admin-jwt.js";

// Cookie configuration.
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const cookieMaxAge =
  Number(process.env.SYSTEM_ADMIN_COOKIE_EXPIRES_IN) || 86400000;

// System Admin Login
export const loginSystemAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find the administrator.
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM system_admins
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const admin = result.rows[0];

    // Check whether the account is active.
    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your System Admin account is inactive.",
      });
    }

    // Compare the entered password with the hashed password.
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate a separate System Admin JWT.
    const token = generateSystemAdminToken(admin.id);

    // Store JWT in an HTTP-only cookie.
    res.cookie("systemAdminToken", token, {
      ...cookieOptions,
      maxAge: cookieMaxAge,
    });

    return res.status(200).json({
      success: true,
      message: "System Admin login successful.",
      data: {
        admin: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
        },
      },
    });
  } catch (error) {
    console.error("System Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
};

// System Admin Logout
export const logoutSystemAdmin = async (_req: Request, res: Response) => {
  res.clearCookie("systemAdminToken", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "System Admin logged out successfully.",
  });
};

// Get Logged-in System Admin
export const getSystemAdminProfile = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, is_active, created_at
       FROM system_admins
       WHERE id = $1`,
      [req.systemAdmin?.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "System Admin not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "System Admin profile fetched successfully.",
      data: {
        admin: result.rows[0],
      },
    });
  } catch (error) {
    console.error("System Admin profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch System Admin profile.",
    });
  }
};
