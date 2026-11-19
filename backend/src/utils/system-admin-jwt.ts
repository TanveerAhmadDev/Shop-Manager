import jwt, { type SignOptions } from "jsonwebtoken";

// Separate secret for System Admin authentication.
const secret = process.env.SYSTEM_ADMIN_JWT_SECRET;

if (!secret) {
  throw new Error("SYSTEM_ADMIN_JWT_SECRET is not configured.");
}

export interface SystemAdminTokenPayload {
  systemAdminId: string;
}

// Generate a JWT for a System Admin.
export const generateSystemAdminToken = (systemAdminId: string) => {
  const expiresIn = (process.env.SYSTEM_ADMIN_JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

  return jwt.sign({ systemAdminId }, secret, { expiresIn });
};

// Verify a System Admin JWT.
export const verifySystemAdminToken = (token: string) => {
  return jwt.verify(token, secret) as SystemAdminTokenPayload;
};
