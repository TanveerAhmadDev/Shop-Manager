import "dotenv/config";

import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";

// Read credentials from environment variables.
const fullName = process.env.SYSTEM_ADMIN_NAME;
const email = process.env.SYSTEM_ADMIN_EMAIL?.toLowerCase().trim();
const password = process.env.SYSTEM_ADMIN_PASSWORD;

async function createSystemAdmin() {
  try {
    // Validate required information.
    if (!fullName || !email || !password) {
      throw new Error(
        "Please provide SYSTEM_ADMIN_NAME, SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD in .env",
      );
    }

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    // Check whether this admin already exists.
    const existingAdmin = await pool.query(
      `SELECT id FROM system_admins WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    if (existingAdmin.rows.length > 0) {
      throw new Error("A System Admin with this email already exists.");
    }

    // Hash the password before saving it.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the first System Admin.
    const result = await pool.query(
      `INSERT INTO system_admins (
        full_name,
        email,
        password_hash
      )
      VALUES ($1, $2, $3)
      RETURNING id, full_name, email, is_active, created_at`,
      [fullName, email, passwordHash],
    );

    console.log("System Admin created successfully!");
    console.table(result.rows[0]);
  } catch (error) {
    console.error("System Admin creation failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createSystemAdmin();
