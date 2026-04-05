import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { verifyToken, requirePermission } from "../middlewares/auth.gaurd";
import { validate } from "../middlewares/validate";
import {
  createTransactionSchema,
  updateTransactionSchema,
  filterTransactionSchema,
  summarySchema,
} from "../schema/transaction.schema";

const router = Router();

// Apply verifyToken to ALL routes in this file
router.use(verifyToken);

// POST /api/transactions
router.post(
  "/",
  requirePermission("record:create"),
  validate(createTransactionSchema),
  TransactionController.create,
);

// GET /api/transactions (Supports query filters like ?type=EXPENSE&category=Food)
router.get(
  "/",
  requirePermission("record:read"),
  validate(filterTransactionSchema),
  TransactionController.getAll,
);

router.get(
  "/summary",
  requirePermission("summary:read"), // Use the specific summary permission!
  validate(summarySchema),
  TransactionController.getSummary,
);

// PATCH /api/transactions/:id
router.patch(
  "/:id",
  requirePermission("record:update"),
  validate(updateTransactionSchema),
  TransactionController.update,
);

// DELETE /api/transactions/:id
router.delete(
  "/:id",
  requirePermission("record:delete"),
  TransactionController.delete,
);

export default router;
