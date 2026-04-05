import { Request } from "express";

// We explicitly extend the Express Request to include our user object
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    permissions: string[];
  };
}
