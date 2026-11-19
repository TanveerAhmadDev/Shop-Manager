import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";

export type UserRole = "owner" | "helper";

export interface AuthTokenPayload {
  userId: string;
  shopId: string;
  role: UserRole;
}

export const generateAccessToken = (payload: AuthTokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

  return jwt.sign(payload, secret, { expiresIn });
};

export const setAuthCookie = (res: Response, token: string): void => {
  const cookieMaxAge = Number(process.env.COOKIE_EXPIRES_IN) || 86400000;

  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};
