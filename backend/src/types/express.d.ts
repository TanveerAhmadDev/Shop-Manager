import type { UserRole } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        shopId: string;
        role: UserRole;
      };
      systemAdmin?: {
        id: string;
      };
    }
  }
}

export {};
