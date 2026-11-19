import { Request, Response } from "express";
import { pool } from "../config/db.js";

// Get platform-wide dashboard statistics.
// System Admin can see data from all shops.
export const getSystemAdminDashboard = async (_req: Request, res: Response) => {
  try {
    // Run all four count queries together.
    const [
      totalShopsResult,
      activeShopsResult,
      inactiveShopsResult,
      totalUsersResult,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM shops"),

      pool.query(
        "SELECT COUNT(*)::int AS total FROM shops WHERE is_active = TRUE",
      ),

      pool.query(
        "SELECT COUNT(*)::int AS total FROM shops WHERE is_active = FALSE",
      ),

      pool.query("SELECT COUNT(*)::int AS total FROM users"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        stats: {
          total_shops: totalShopsResult.rows[0].total,
          active_shops: activeShopsResult.rows[0].total,
          inactive_shops: inactiveShopsResult.rows[0].total,
          total_users: totalUsersResult.rows[0].total,
        },
      },
    });
  } catch (error) {
    console.error("System Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard statistics.",
    });
  }
};
