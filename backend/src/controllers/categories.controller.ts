import { Request, Response } from "express";
import { pool } from "../config/db.js";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const shopId = req.user?.shopId;

    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, name
      FROM categories
      WHERE shop_id = $1
      ORDER BY name ASC
      `,
      [shopId],
    );

    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully.",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve categories.",
    });
  }
};
