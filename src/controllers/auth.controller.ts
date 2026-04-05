import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role } = req.body;

      // Basic Input Validation
      if (!email || !password) {
        res
          .status(400)
          .json({
            status: "error",
            message: "Email and password are required.",
          });
        return; // Early return prevents further execution
      }

      // Call the service (Defaults to 'Viewer' if no role is provided)
      const newUser = await AuthService.registerUser(email, password, role);

      res.status(201).json({
        status: "success",
        message: "User registered successfully.",
        data: newUser,
      });
    } catch (error: any) {
      // If it's our custom thrown error, send a 400 Bad Request. Otherwise, 500.
      const statusCode = error.message.includes("already exists") ? 409 : 400;
      res.status(statusCode).json({ status: "error", message: error.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res
          .status(400)
          .json({
            status: "error",
            message: "Email and password are required.",
          });
        return;
      }

      const result = await AuthService.loginUser(email, password);

      res.status(200).json({
        status: "success",
        message: "Login successful.",
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({ status: "error", message: error.message });
    }
  }
}
