import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { pool } from "../config/db.js";
import type { UserRole } from "../utils/jwt.js";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    // Always get current user information from PostgreSQL.
    const result = await pool.query(
      `SELECT
         u.id,
         u.shop_id,
         u.role,
         u.is_active,
         s.is_active AS shop_is_active
       FROM users u
       JOIN shops s ON s.id = u.shop_id
       WHERE u.id = $1`,
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active || !user.shop_is_active) {
      res.status(403).json({
        success: false,
        message: "Your account or shop is inactive.",
      });
      return;
    }

    // Attach trusted database information to the request.
    req.user = {
      userId: user.id,
      shopId: user.shop_id,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
      return;
    }

    console.error("Authentication error:", error);

    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};
