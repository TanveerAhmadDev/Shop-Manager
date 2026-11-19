import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db.js";
import { verifySystemAdminToken } from "../utils/system-admin-jwt.js";

export const authenticateSystemAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Read the separate System Admin cookie.
    const token = req.cookies?.systemAdminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "System Admin authentication required.",
      });
    }

    // Verify the JWT.
    const decoded = verifySystemAdminToken(token);

    if (!decoded.systemAdminId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Confirm that the System Admin still exists and is active.
    const result = await pool.query(
      `SELECT id
       FROM system_admins
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.systemAdminId],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Your System Admin account is inactive.",
      });
    }

    req.systemAdmin = {
      id: result.rows[0].id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};
