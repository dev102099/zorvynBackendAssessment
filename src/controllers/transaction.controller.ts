import { Request, Response } from "express";
import { TransactionService } from "../services/transaction.service";
import { AuthRequest } from "../types/authRequest";

export class TransactionController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const transaction = await TransactionService.create(userId, req.body);

      res.status(201).json({ status: "success", data: transaction });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      // The service now returns { data, meta }
      const result = await TransactionService.findAll(req.query);

      res.status(200).json({
        status: "success",
        data: result.data,
        meta: result.meta,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as { id: string };

      const updatedTransaction = await TransactionService.update(
        id,
        userId,
        req.body,
      );
      res.status(200).json({ status: "success", data: updatedTransaction });
    } catch (error: any) {
      const statusCode = error.message.includes("not found") ? 404 : 500;
      res.status(statusCode).json({ status: "error", message: error.message });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as { id: string };

      await TransactionService.delete(id, userId);
      res.status(204).send();
    } catch (error: any) {
      const statusCode = error.message.includes("not found") ? 404 : 500;
      res.status(statusCode).json({ status: "error", message: error.message });
    }
  }

  static async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const summary = await TransactionService.getSummary(userId, req.query);

      res.status(200).json({ status: "success", data: summary });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
}
