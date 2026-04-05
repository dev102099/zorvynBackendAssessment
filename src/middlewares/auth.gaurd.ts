import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../types/authRequest";

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_take_home_key_change_me_later";

// user validation and token verification middleware
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Grab the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ status: "error", message: "Access denied. No token provided." });
    return;
  }

  // 2. Extract the token string (Remove the word "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // 3. Verify the token using our secret key
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      permissions: string[];
    };

    // 4. Attach the decoded payload to the request so the next functions can use it
    req.user = decoded;

    // 5. Let the user pass!
    next();
  } catch (error) {
    res
      .status(403)
      .json({ status: "error", message: "Invalid or expired token." });
  }
};

// permission checking middleware factory
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Safety check: Ensure verifyToken ran first
    if (!req.user) {
      res
        .status(401)
        .json({ status: "error", message: "User not authenticated." });
      return;
    }

    // Check if the user's permission array includes the required action
    if (!req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({
        status: "error",
        message: `Forbidden: You lack the '${requiredPermission}' permission.`,
      });
      return;
    }

    // They have the permission, let them through!
    next();
  };
};
